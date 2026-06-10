import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { 
  Receipt, ShoppingCart, Plus, Trash2, Edit2, ShieldAlert, 
  Search, Users, Landmark, Coffee, Settings2, FileText, CheckCircle2,
  FolderOpen, Power, Printer, Eye, X, HelpCircle, Package, Archive, AlertTriangle
} from 'lucide-react';

const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const PosManagement = () => {
  const [activeTab, setActiveTab] = useState('tables'); // default to 'tables'
  
  // Data States
  const [outlets, setOutlets] = useState([]);
  const [items, setItems] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [heldOrders, setHeldOrders] = useState([]);
  const [wastageLogs, setWastageLogs] = useState([]);
  const [tables, setTables] = useState([]); // POS tables
  const [isLoading, setIsLoading] = useState(true);

  // Billing Cart States
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [cart, setCart] = useState([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [chargeType, setChargeType] = useState('direct'); // 'direct', 'room'
  const [selectedBooking, setSelectedBooking] = useState(''); // for room charge
  const [guestName, setGuestName] = useState(''); // for direct payment
  const [roomNumber, setRoomNumber] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [retrievedOrderId, setRetrievedOrderId] = useState(null); // tracking retrieved hold order
  const [selectedTable, setSelectedTable] = useState(''); // active billing table ID
  const [covers, setCovers] = useState(1); // PAX covers size

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  // Configuration forms
  const [outletForm, setOutletForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ name: '', price: '', taxRate: '5', category: 'Food', posOutletId: '', trackInventory: false, stockQuantity: 0, lowStockThreshold: 5 });
  const [isAddingOutlet, setIsAddingOutlet] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingOutlet, setEditingOutlet] = useState(null);

  // Stock Adjustment / Spoilage forms
  const [isAddingWastage, setIsAddingWastage] = useState(false);
  const [wastageForm, setWastageForm] = useState({ posOutletId: '', itemId: '', quantity: '', reason: 'expired', notes: '' });
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [adjustStockForm, setAdjustStockForm] = useState({ itemId: '', quantityToAdd: '' });

  // F&B Table & Seat Management states
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ name: '', seatingCapacity: 2, section: 'Main Hall', gridX: 1, gridY: 1 });
  const [floorEditMode, setFloorEditMode] = useState(false);
  const [activeSectionFilter, setActiveSectionFilter] = useState('All');
  const [isTransferringTable, setIsTransferringTable] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromTableId: '', toTableId: '', orderId: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // If outlet changes, reset cart and table selection
  useEffect(() => {
    setCart([]);
    setSelectedTable('');
    setCovers(1);
  }, [selectedOutlet]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [outletsRes, itemsRes, bookingsRes, ordersRes, holdsRes, wastageRes, tablesRes] = await Promise.all([
        api.get('/admin/pos/outlets'),
        api.get('/admin/pos/items'),
        api.get('/admin/bookings'),
        api.get('/admin/pos/orders?status=completed'),
        api.get('/admin/pos/orders?status=draft'),
        api.get('/admin/pos/wastage'),
        api.get('/admin/pos/tables')
      ]);

      setOutlets(outletsRes.data);
      setItems(itemsRes.data);
      
      // Filter only checked-in bookings for room charges
      const checkedIn = bookingsRes.data.filter(b => b.status === 'checked-in');
      setActiveBookings(checkedIn);
      setOrders(ordersRes.data);
      setHeldOrders(holdsRes.data);
      setWastageLogs(wastageRes.data);
      setTables(tablesRes.data);

      if (outletsRes.data.length > 0 && !selectedOutlet) {
        setSelectedOutlet(outletsRes.data[0]._id);
      }
    } catch (error) {
      toast.error('Failed to load POS billing data');
    } finally {
      setIsLoading(false);
    }
  };

  // Cart operations
  const addToCart = (product) => {
    if (!selectedOutlet) return toast.error('Please select a POS outlet first');
    
    // Check stock level
    if (product.trackInventory) {
      const existingInCart = cart.find(item => item.itemId === product._id);
      const currentQty = existingInCart ? existingInCart.quantity : 0;
      if (currentQty >= product.stockQuantity) {
        return toast.error(`Cannot add more. Only ${product.stockQuantity} units available in stock.`);
      }
    }

    setCart(prev => {
      const existing = prev.find(item => item.itemId === product._id);
      if (existing) {
        return prev.map(item => 
          item.itemId === product._id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [...prev, {
          itemId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          taxRate: product.taxRate || 0
        }];
      }
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (itemId, q) => {
    const product = items.find(it => it._id === itemId);
    if (product && product.trackInventory && q > product.stockQuantity) {
      return toast.error(`Cannot increase quantity. Only ${product.stockQuantity} units available in stock.`);
    }

    setCart(prev => prev.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity: Math.max(1, q) } 
        : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.itemId !== itemId));
  };

  // Calculations
  const getCartTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    
    cart.forEach(item => {
      const lineSubtotal = item.price * item.quantity;
      const lineTax = lineSubtotal * (item.taxRate / 100);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
    });

    const subtotalRounded = roundToTwo(subtotal);
    const taxTotalRounded = roundToTwo(taxTotal);
    const discountAmount = Number(cartDiscount || 0);
    const totalAmount = roundToTwo(Math.max(0, subtotalRounded + taxTotalRounded - discountAmount));

    return {
      subtotal: subtotalRounded,
      taxTotal: taxTotalRounded,
      discountAmount,
      totalAmount
    };
  };

  const { subtotal, taxTotal, discountAmount, totalAmount } = getCartTotals();

  // Order submission
  const handlePlaceOrder = async (orderStatus) => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (chargeType === 'room' && !selectedBooking) return toast.error('Please select a guest room for charge');
    if (chargeType === 'direct' && !guestName.trim() && orderStatus !== 'draft') {
      return toast.error('Please provide a guest name for direct billing');
    }

    setIsSubmittingOrder(true);
    const toastId = toast.loading(orderStatus === 'draft' ? 'Holding order...' : 'Finalizing bill...');
    
    try {
      let payload = {
        posOutletId: selectedOutlet,
        items: cart,
        discount: discountAmount,
        status: orderStatus, // 'completed' or 'draft'
      };

      if (selectedTable) {
        payload.tableId = selectedTable;
        payload.covers = Number(covers);
      }

      if (orderStatus === 'draft') {
        payload.guestName = guestName.trim() || 'Held Order';
        payload.roomNumber = roomNumber || '';
        payload.bookingId = selectedBooking || null;
      } else {
        if (chargeType === 'room') {
          const bookingObj = activeBookings.find(b => b._id === selectedBooking);
          payload.bookingId = selectedBooking;
          payload.guestName = bookingObj?.guestName || 'Folio Charge';
          payload.roomNumber = bookingObj?.roomId?.roomNumber || '';
          payload.paymentMethod = 'room_charge';
        } else {
          payload.guestName = guestName.trim();
          payload.roomNumber = '';
          payload.bookingId = null;
          payload.paymentMethod = paymentMethod;
        }
      }

      let res;
      if (retrievedOrderId) {
        // Update existing held order
        res = await api.put(`/admin/pos/orders/${retrievedOrderId}`, payload);
      } else {
        // Create new order
        res = await api.post('/admin/pos/orders', payload);
      }

      toast.success(
        orderStatus === 'draft' 
          ? 'Order placed on Hold' 
          : 'POS bill created successfully!', 
        { id: toastId }
      );

      // Clean billing states
      setCart([]);
      setCartDiscount(0);
      setGuestName('');
      setSelectedBooking('');
      setRoomNumber('');
      setRetrievedOrderId(null);
      setSelectedTable('');
      setCovers(1);

      // Show receipt modal if finalized
      if (orderStatus === 'completed') {
        setReceiptOrder(res.data);
        setShowReceiptModal(true);
        setActiveTab('orders');
      } else {
        setActiveTab('hold');
      }
    } catch (error) {
      toast.error('Failed to save POS order: ' + (error.response?.data?.message || error.message), { id: toastId });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Retrieve held order
  const handleRetrieveOrder = (order) => {
    setSelectedOutlet(order.posOutletId?._id || order.posOutletId);
    
    const mappedCart = order.items.map(item => ({
      itemId: item.itemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      taxRate: item.taxRate
    }));

    setCart(mappedCart);
    setCartDiscount(order.discount || 0);
    setRetrievedOrderId(order._id);
    
    if (order.bookingId) {
      setChargeType('room');
      setSelectedBooking(order.bookingId?._id || order.bookingId);
      setRoomNumber(order.roomNumber);
    } else {
      setChargeType('direct');
      setGuestName(order.guestName);
    }

    if (order.tableId) {
      setSelectedTable(order.tableId?._id || order.tableId);
      setCovers(order.covers || 1);
    } else {
      setSelectedTable('');
      setCovers(1);
    }

    setActiveTab('creation');
    toast.success(`Retrieved Hold Order ${order.orderNumber}`);
  };

  // Void order
  const handleVoidOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to void this order?')) return;
    
    const toastId = toast.loading('Voiding order...');
    try {
      await api.delete(`/admin/pos/orders/${orderId}`);
      toast.success('Order voided successfully!', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Failed to void order', { id: toastId });
    }
  };

  // POS Outlets management
  const handleCreateOutlet = async (e) => {
    e.preventDefault();
    if (!outletForm.name.trim()) return toast.error('Outlet name is required');
    try {
      if (editingOutlet) {
        await api.put(`/admin/pos/outlets/${editingOutlet._id}`, outletForm);
        toast.success('POS Outlet updated');
      } else {
        await api.post('/admin/pos/outlets', outletForm);
        toast.success('POS Outlet created');
      }
      setOutletForm({ name: '', description: '' });
      setIsAddingOutlet(false);
      setEditingOutlet(null);
      fetchData();
    } catch (e) {
      toast.error('Failed to configure outlet');
    }
  };

  const handleEditOutlet = (outlet) => {
    setEditingOutlet(outlet);
    setOutletForm({ name: outlet.name, description: outlet.description || '' });
    setIsAddingOutlet(true);
  };

  const handleDeleteOutlet = async (id) => {
    if (!window.confirm('Delete this Outlet? All associated menu items will be set to inactive.')) return;
    try {
      await api.delete(`/admin/pos/outlets/${id}`);
      toast.success('Outlet deleted successfully');
      fetchData();
    } catch (e) {
      toast.error('Failed to delete outlet');
    }
  };

  // POS Items management
  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.posOutletId) {
      return toast.error('Please fill all required fields');
    }
    try {
      if (editingItem) {
        await api.put(`/admin/pos/items/${editingItem._id}`, itemForm);
        toast.success('Menu item updated');
      } else {
        await api.post('/admin/pos/items', itemForm);
        toast.success('Menu item added');
      }
      setItemForm({ name: '', price: '', taxRate: '5', category: 'Food', posOutletId: selectedOutlet, trackInventory: false, stockQuantity: 0, lowStockThreshold: 5 });
      setIsAddingItem(false);
      setEditingItem(null);
      fetchData();
    } catch (e) {
      toast.error('Failed to save menu item');
    }
  };

  const handleEditItem = (product) => {
    setEditingItem(product);
    setItemForm({
      name: product.name,
      price: product.price,
      taxRate: String(product.taxRate || 5),
      category: product.category || 'Food',
      posOutletId: product.posOutletId?._id || product.posOutletId,
      trackInventory: product.trackInventory || false,
      stockQuantity: product.stockQuantity || 0,
      lowStockThreshold: product.lowStockThreshold || 5
    });
    setIsAddingItem(true);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/admin/pos/items/${id}`);
      toast.success('Menu item deleted');
      fetchData();
    } catch (e) {
      toast.error('Failed to delete item');
    }
  };

  const handleRecordWastage = async (e) => {
    e.preventDefault();
    if (!wastageForm.posOutletId || !wastageForm.itemId || !wastageForm.quantity) {
      return toast.error('Please fill all required fields');
    }
    
    const qty = parseInt(wastageForm.quantity);
    const selectedProduct = items.find(it => it._id === wastageForm.itemId);
    if (selectedProduct && selectedProduct.trackInventory && selectedProduct.stockQuantity < qty) {
      return toast.error(`Insufficient stock to log wastage. Available: ${selectedProduct.stockQuantity}`);
    }

    const toastId = toast.loading('Logging wastage...');
    try {
      await api.post('/admin/pos/wastage', wastageForm);
      toast.success('Wastage logged successfully!', { id: toastId });
      setWastageForm({ posOutletId: '', itemId: '', quantity: '', reason: 'expired', notes: '' });
      setIsAddingWastage(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to log wastage', { id: toastId });
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustStockForm.itemId || !adjustStockForm.quantityToAdd) {
      return toast.error('Please specify quantity to add');
    }

    const qty = parseInt(adjustStockForm.quantityToAdd);
    const product = items.find(it => it._id === adjustStockForm.itemId);
    if (!product) return;

    const toastId = toast.loading('Adjusting stock level...');
    try {
      const updatedStock = product.stockQuantity + qty;
      await api.put(`/admin/pos/items/${product._id}`, {
        ...product,
        posOutletId: product.posOutletId?._id || product.posOutletId,
        stockQuantity: updatedStock
      });
      toast.success('Stock adjusted successfully!', { id: toastId });
      setAdjustStockForm({ itemId: '', quantityToAdd: '' });
      setIsAdjustingStock(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to adjust stock', { id: toastId });
    }
  };

  // F&B Table Management Handlers
  const handleCreateTable = async (e) => {
    e.preventDefault();
    if (!tableForm.name.trim() || !selectedOutlet) {
      return toast.error('Table name and active outlet are required');
    }
    try {
      const payload = {
        ...tableForm,
        posOutletId: selectedOutlet
      };
      if (editingTable) {
        await api.put(`/admin/pos/tables/${editingTable._id}`, payload);
        toast.success('Table updated');
      } else {
        await api.post('/admin/pos/tables', payload);
        toast.success('Table created');
      }
      setTableForm({ name: '', seatingCapacity: 2, section: 'Main Hall', gridX: 1, gridY: 1 });
      setIsAddingTable(false);
      setEditingTable(null);
      fetchData();
    } catch (e) {
      toast.error('Failed to configure table');
    }
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setTableForm({
      name: table.name,
      seatingCapacity: table.seatingCapacity,
      section: table.section || 'Main Hall',
      gridX: table.gridX || 1,
      gridY: table.gridY || 1
    });
    setIsAddingTable(true);
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      await api.delete(`/admin/pos/tables/${id}`);
      toast.success('Table deleted');
      fetchData();
    } catch (e) {
      toast.error('Failed to delete table');
    }
  };

  const handleTransferTable = async (e) => {
    e.preventDefault();
    if (!transferForm.fromTableId || !transferForm.toTableId || !transferForm.orderId) {
      return toast.error('Please specify both tables and the active order');
    }
    const toastId = toast.loading('Transferring table order...');
    try {
      await api.post(`/admin/pos/orders/${transferForm.orderId}/transfer-table`, {
        fromTableId: transferForm.fromTableId,
        toTableId: transferForm.toTableId
      });
      toast.success('Order transferred successfully!', { id: toastId });
      setIsTransferringTable(false);
      setTransferForm({ fromTableId: '', toTableId: '', orderId: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to transfer order: ' + (error.response?.data?.message || error.message), { id: toastId });
    }
  };

  const updateTableCoordinates = async (tableId, gridX, gridY) => {
    try {
      await api.put(`/admin/pos/tables/${tableId}`, { gridX, gridY });
      const tablesRes = await api.get('/admin/pos/tables');
      setTables(tablesRes.data);
    } catch (e) {
      toast.error('Failed to update table location');
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8 max-w-7xl mx-auto text-slate-200">
      
      {/* Premium Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg-reception.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="relative z-10 p-10 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg flex items-center">
              <Receipt className="mr-3 text-blue-500" size={36} /> POS & Billing
            </h2>
            <p className="text-base text-slate-300 max-w-xl leading-relaxed drop-shadow-md">
              Order billing, terminal generation, holds, and menu setup for dining and services.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => { setEditingOutlet(null); setOutletForm({ name: '', description: '' }); setIsAddingOutlet(true); }}
              className="flex items-center px-4 py-2.5 bg-white/5 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-bold transition-all"
            >
              <Plus size={16} className="mr-1.5" /> Setup POS Outlet
            </button>
            <button 
              onClick={() => { setEditingItem(null); setItemForm({ name: '', price: '', taxRate: '5', category: 'Food', posOutletId: selectedOutlet }); setIsAddingItem(true); }}
              className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus size={16} className="mr-1.5" /> Create Menu Item
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-[#13151a]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-lg overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'tables' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Coffee size={16} className="mr-2" /> Tables & Floor Plan
        </button>
        <button
          onClick={() => setActiveTab('creation')}
          className={`flex items-center px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'creation' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingCart size={16} className="mr-2" /> POS Creation (Billing)
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center px-6 py-3.5 rounded-xl font-bold text-sm transition-all relative ${
            activeTab === 'orders' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText size={16} className="mr-2" /> POS Orders
        </button>
        <button
          onClick={() => setActiveTab('hold')}
          className={`flex items-center px-6 py-3.5 rounded-xl font-bold text-sm transition-all relative ${
            activeTab === 'hold' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderOpen size={16} className="mr-2" /> POS Orders Hold
          {heldOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
              {heldOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Package size={16} className="mr-2" /> POS Inventory
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'items' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings2 size={16} className="mr-2" /> POS Order Items
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 flex items-center gap-3 justify-center py-16">
          <Printer className="animate-spin text-blue-500" />
          <span>Syncing details with terminal...</span>
        </div>
      ) : (
        <>
          {/* ========================================================
              TAB: TABLES & FLOOR PLAN
             ======================================================== */}
          {activeTab === 'tables' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Controls bar */}
              <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* Outlet selector and Section filter */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">POS Outlet</label>
                    <select 
                      value={selectedOutlet}
                      onChange={e => setSelectedOutlet(e.target.value)}
                      className="px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none cursor-pointer text-xs font-semibold"
                    >
                      {outlets.map(o => (
                        <option key={o._id} value={o._id}>{o.name}</option>
                      ))}
                      {outlets.length === 0 && <option value="">No outlets configured</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Floor Section</label>
                    <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 gap-1">
                      {['All', 'Main Hall', 'VIP Section', 'Bar Area', 'Terrace'].map(sec => (
                        <button
                          key={sec}
                          onClick={() => setActiveSectionFilter(sec)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            activeSectionFilter === sec 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions: Edit floor mode, Add table */}
                <div className="flex gap-3 self-end md:self-center">
                  <button
                    onClick={() => setFloorEditMode(prev => !prev)}
                    className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      floorEditMode 
                        ? 'bg-amber-600/10 text-amber-400 border-amber-500/30' 
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Settings2 size={14} className="mr-1.5" /> 
                    {floorEditMode ? 'Exit Layout Edit' : 'Edit Floor Layout'}
                  </button>

                  {floorEditMode && (
                    <button
                      onClick={() => {
                        setEditingTable(null);
                        setTableForm({ name: '', seatingCapacity: 2, section: 'Main Hall', gridX: 1, gridY: 1 });
                        setIsAddingTable(true);
                      }}
                      className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 animate-in zoom-in-95 duration-250"
                    >
                      <Plus size={14} className="mr-1.5" /> Add Table
                    </button>
                  )}
                </div>

              </div>

              {/* DUAL LAYOUT: Floor Plan Grid + Unpositioned Tables Sidebar */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Main Floor Grid - 9 Cols */}
                <div className="xl:col-span-9 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-xl space-y-6 overflow-x-auto">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center">
                        <Coffee className="mr-2 text-blue-500" size={18} /> Restaurant Floor Plan
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">Layout mapping for occupancy and service auditing</p>
                    </div>
                    {floorEditMode && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full animate-pulse">
                        Layout Editor Active
                      </span>
                    )}
                  </div>

                  {/* Floor Plan Grid (8 Columns x 5 Rows) */}
                  <div className="relative min-w-[700px] bg-black/30 border border-white/5 rounded-2xl p-6 grid grid-cols-8 gap-4 font-sans select-none">
                    {/* Render cells row by row */}
                    {Array.from({ length: 5 }, (_, rowIndex) => {
                      const row = rowIndex + 1;
                      return Array.from({ length: 8 }, (_, colIndex) => {
                        const col = colIndex + 1;
                        
                        // Find if table exists at coordinates
                        const table = tables
                          .filter(t => t.posOutletId === selectedOutlet || t.posOutletId?._id === selectedOutlet)
                          .filter(t => activeSectionFilter === 'All' || t.section === activeSectionFilter)
                          .find(t => t.gridX === col && t.gridY === row);

                        return (
                          <div 
                            key={`${row}-${col}`}
                            className={`h-32 rounded-xl flex flex-col justify-between p-3.5 transition-all relative ${
                              table 
                                ? table.status === 'occupied'
                                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/5 animate-in fade-in duration-200'
                                  : table.status === 'reserved'
                                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer shadow-lg shadow-emerald-500/5'
                                : floorEditMode
                                  ? 'border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 cursor-pointer flex items-center justify-center text-slate-500 hover:text-slate-300'
                                  : 'border border-transparent opacity-10'
                            }`}
                            onClick={() => {
                              if (table) {
                                if (!floorEditMode) {
                                  if (table.status === 'available') {
                                    // Start cart order
                                    setSelectedTable(table._id);
                                    setCovers(1);
                                    setGuestName(`${table.name} Active`);
                                    setActiveTab('creation');
                                    toast.success(`Started order for ${table.name}`);
                                  }
                                }
                              } else {
                                if (floorEditMode) {
                                  // Open Add Table at coordinates
                                  setEditingTable(null);
                                  setTableForm({ name: `Table ${tables.length + 1}`, seatingCapacity: 4, section: activeSectionFilter === 'All' ? 'Main Hall' : activeSectionFilter, gridX: col, gridY: row });
                                  setIsAddingTable(true);
                                }
                              }
                            }}
                          >
                            {table ? (
                              <>
                                {/* Table Label */}
                                <div className="flex justify-between items-start w-full">
                                  <div>
                                    <span className="font-black text-white text-xs block leading-tight">{table.name}</span>
                                    <span className="text-[9px] text-slate-400 font-bold block">{table.section}</span>
                                  </div>
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-white">
                                    Pax {table.seatingCapacity}
                                  </span>
                                </div>

                                {/* Active Order details if occupied */}
                                {table.status === 'occupied' && table.currentOrderId ? (
                                  <div className="w-full space-y-1 my-1 text-[10px]">
                                    <div className="flex justify-between text-slate-300 font-medium">
                                      <span>Covers:</span>
                                      <span className="font-bold text-white">{table.covers} Pax</span>
                                    </div>
                                    <div className="flex justify-between text-slate-300 font-medium">
                                      <span>Amount:</span>
                                      <span className="font-bold text-rose-300">₹{(table.currentOrderId?.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-500 font-semibold italic">
                                    {table.status === 'reserved' ? 'Reserved' : 'Vacant'}
                                  </div>
                                )}

                                {/* Action controls based on status / edit mode */}
                                <div className="w-full flex justify-between items-center pt-1.5 border-t border-white/5 mt-1">
                                  {floorEditMode ? (
                                    <div className="flex justify-between items-center w-full gap-1">
                                      {/* Coordinates Grid Movement Arrows */}
                                      <div className="flex items-center gap-0.5">
                                        <button 
                                          title="Move Up"
                                          disabled={row === 1}
                                          onClick={(e) => { e.stopPropagation(); updateTableCoordinates(table._id, col, row - 1); }}
                                          className="p-1 bg-black/40 border border-white/5 rounded hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          ↑
                                        </button>
                                        <button 
                                          title="Move Down"
                                          disabled={row === 5}
                                          onClick={(e) => { e.stopPropagation(); updateTableCoordinates(table._id, col, row + 1); }}
                                          className="p-1 bg-black/40 border border-white/5 rounded hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          ↓
                                        </button>
                                        <button 
                                          title="Move Left"
                                          disabled={col === 1}
                                          onClick={(e) => { e.stopPropagation(); updateTableCoordinates(table._id, col - 1, row); }}
                                          className="p-1 bg-black/40 border border-white/5 rounded hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          ←
                                        </button>
                                        <button 
                                          title="Move Right"
                                          disabled={col === 8}
                                          onClick={(e) => { e.stopPropagation(); updateTableCoordinates(table._id, col + 1, row); }}
                                          className="p-1 bg-black/40 border border-white/5 rounded hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          →
                                        </button>
                                      </div>
                                      <div className="flex gap-1">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleEditTable(table); }}
                                          className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"
                                        >
                                          <Edit2 size={10} />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteTable(table._id); }}
                                          className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded hover:bg-rose-550 hover:text-white"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : table.status === 'occupied' ? (
                                    <div className="flex justify-between items-center w-full gap-1">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleRetrieveOrder(table.currentOrderId); }}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-black uppercase transition-all"
                                      >
                                        Edit Cart
                                      </button>
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setTransferForm({ fromTableId: table._id, toTableId: '', orderId: table.currentOrderId?._id || table.currentOrderId }); 
                                          setIsTransferringTable(true); 
                                        }}
                                        className="px-1.5 py-1 bg-white/5 hover:bg-white/10 text-slate-350 border border-white/10 rounded text-[9px] font-black uppercase transition-all"
                                        title="Transfer Table"
                                      >
                                        Move
                                      </button>
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleRetrieveOrder(table.currentOrderId);
                                          setChargeType('direct');
                                        }}
                                        className="p-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded border border-emerald-500/30 transition-all"
                                        title="Complete & Settle Bill"
                                      >
                                        <CheckCircle2 size={10} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-450 flex items-center">
                                      Click to seat Guest
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : floorEditMode ? (
                              <div className="flex flex-col items-center gap-1 justify-center h-full">
                                <Plus size={16} />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Empty</span>
                                <span className="text-[8px] text-slate-500 font-bold">X:{col} Y:{row}</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>

                {/* Sidebar: Unpositioned Tables - 3 Cols */}
                <div className="xl:col-span-3 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                      <Archive className="mr-1.5 text-blue-500" size={16} /> Ready to Position
                    </h3>
                    <p className="text-[10px] text-slate-450 mt-1 leading-normal">
                      Tables registered under this outlet that have not been positioned on the floor map grid coordinates.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {tables
                      .filter(t => t.posOutletId === selectedOutlet || t.posOutletId?._id === selectedOutlet)
                      .filter(t => t.gridX === 0 || t.gridY === 0).map(t => (
                        <div key={t._id} className="bg-black/20 p-3.5 rounded-xl border border-white/5 flex justify-between items-center gap-3">
                          <div>
                            <span className="font-bold text-white text-xs block">{t.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold block">{t.section} (Seats {t.seatingCapacity})</span>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {floorEditMode ? (
                              <button
                                onClick={() => {
                                  let found = false;
                                  for (let r = 1; r <= 5; r++) {
                                    for (let c = 1; c <= 8; c++) {
                                      const exists = tables.find(tbl => tbl.gridX === c && tbl.gridY === r);
                                      if (!exists) {
                                        updateTableCoordinates(t._id, c, r);
                                        toast.success(`Positioned ${t.name} at X:${c} Y:${r}`);
                                        found = true;
                                        break;
                                      }
                                    }
                                    if (found) break;
                                  }
                                  if (!found) toast.error('No vacant grid spots available');
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-black uppercase transition-all"
                              >
                                Auto Place
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-500 font-bold italic">Enable Edit Mode</span>
                            )}
                          </div>
                        </div>
                    ))}

                    {tables
                      .filter(t => t.posOutletId === selectedOutlet || t.posOutletId?._id === selectedOutlet)
                      .filter(t => t.gridX === 0 || t.gridY === 0).length === 0 && (
                      <p className="text-center text-slate-500 italic text-xs py-8">
                        All tables positioned.
                      </p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================
              TAB: BILLING / POS CREATION
             ======================================================== */}
          {activeTab === 'creation' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Product list - 7 Cols */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                  
                  {/* Select Outlet & Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-white/5 pb-4">
                    <div className="w-full sm:w-64">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">POS Outlet / Department</label>
                      <select 
                        value={selectedOutlet}
                        onChange={e => setSelectedOutlet(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none transition-all cursor-pointer text-sm font-semibold"
                      >
                        {outlets.map(o => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                        {outlets.length === 0 && <option value="">No outlets configured</option>}
                      </select>
                    </div>
                    
                    {retrievedOrderId && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center self-end h-full">
                        Editing Hold Order
                      </div>
                    )}
                  </div>

                  {/* Products Grid */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Available Items</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {items.filter(it => it.posOutletId?._id === selectedOutlet || it.posOutletId === selectedOutlet).map(product => {
                        const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;
                        const isLowStock = product.trackInventory && product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0;
                        
                        return (
                          <button 
                            key={product._id}
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product)}
                            className={`w-full text-left bg-black/20 border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between h-36 group relative ${
                              isOutOfStock 
                                ? 'opacity-40 cursor-not-allowed border-rose-500/10' 
                                : 'hover:bg-white/5 border-white/5 hover:border-white/10 hover:-translate-y-0.5 cursor-pointer'
                            }`}
                          >
                            <div className="w-full">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[9px] font-black uppercase text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20 truncate">{product.category}</span>
                                
                                {product.trackInventory && (
                                  isOutOfStock ? (
                                    <span className="text-[9px] font-black uppercase text-rose-400 px-2 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/20 whitespace-nowrap">Out of Stock</span>
                                  ) : isLowStock ? (
                                    <span className="text-[9px] font-black uppercase text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20 whitespace-nowrap">Low: {product.stockQuantity}</span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 whitespace-nowrap">Stock: {product.stockQuantity}</span>
                                  )
                                )}
                              </div>
                              <h4 className="font-bold text-white text-xs mt-3.5 line-clamp-2 group-hover:text-blue-400 transition-colors leading-snug">{product.name}</h4>
                            </div>
                            <div className="flex justify-between items-center mt-2 w-full font-sans">
                              <span className="text-xs font-black text-slate-200">₹{product.price.toFixed(2)}</span>
                              <span className="text-[9px] text-slate-500 font-bold">GST {product.taxRate}%</span>
                            </div>
                          </button>
                        );
                      })}
                      
                      {items.filter(it => it.posOutletId?._id === selectedOutlet || it.posOutletId === selectedOutlet).length === 0 && (
                        <div className="col-span-full py-16 text-center text-slate-500 italic text-sm">
                          No items found inside this outlet. Please add items in the "POS Order Items" tab.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Order Cart Checkout - 5 Cols */}
              <div className="lg:col-span-5 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center border-b border-white/5 pb-4">
                  <ShoppingCart className="mr-2 text-blue-500" size={20} /> Current Cart
                </h3>

                {/* Cart Items List */}
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                  {cart.map(item => (
                    <div key={item.itemId} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="overflow-hidden pr-2">
                        <p className="font-bold text-white text-xs truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">₹{item.price.toFixed(2)} + {item.taxRate}% tax</p>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center bg-black/30 border border-white/10 rounded-lg overflow-hidden">
                          <button 
                            onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => removeFromCart(item.itemId)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {cart.length === 0 && (
                    <div className="py-12 text-center text-slate-500 italic text-xs">
                      Cart is empty. Click items on the left to add.
                    </div>
                  )}
                </div>

                {/* Billing Summary Details */}
                <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between font-bold text-slate-400">
                    <span>Cart Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-400">
                    <span>Tax (GST)</span>
                    <span>₹{taxTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-slate-400">Apply Discount (₹)</span>
                    <input 
                      type="number"
                      value={cartDiscount}
                      min="0"
                      onChange={e => setCartDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-24 px-2 py-1 bg-[#0f1115] text-white rounded border border-white/10 focus:border-blue-500 text-right font-bold focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-dashed border-white/10 my-2 pt-2 flex justify-between items-center font-black text-sm">
                    <span className="text-white">Payable Total</span>
                    <span className="text-blue-400 text-base">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Table & Covers Selector */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dining Table</label>
                      <select
                        value={selectedTable}
                        onChange={e => {
                          const tblId = e.target.value;
                          setSelectedTable(tblId);
                          if (tblId) {
                            const tblObj = tables.find(t => t._id === tblId);
                            if (tblObj) {
                              setGuestName(prev => prev.trim() ? prev : `${tblObj.name} Active`);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#0f1115] text-white text-xs rounded-lg border border-white/10 focus:border-blue-500 outline-none cursor-pointer font-bold"
                      >
                        <option value="">-- Direct / No Table --</option>
                        {tables.filter(t => t.posOutletId === selectedOutlet || t.posOutletId?._id === selectedOutlet).map(t => (
                          <option key={t._id} value={t._id} disabled={t.status === 'occupied' && t.currentOrderId !== retrievedOrderId}>
                            {t.name} ({t.status === 'occupied' ? 'Occupied' : `Seats ${t.seatingCapacity}`})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Covers (Pax)</label>
                      <input 
                        type="number"
                        min="1"
                        value={covers}
                        disabled={!selectedTable}
                        onChange={e => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setCovers(val);
                          if (selectedTable) {
                            const tblObj = tables.find(t => t._id === selectedTable);
                            if (tblObj && val > tblObj.seatingCapacity) {
                              toast.error(`Warning: Pax (${val}) exceeds seating capacity (${tblObj.seatingCapacity}) of ${tblObj.name}`, { id: 'pax-warn' });
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#0f1115] text-white text-xs rounded-lg border border-white/10 focus:border-blue-500 focus:outline-none text-center font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Target Selector */}
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Billing Charge Option</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setChargeType('direct'); setSelectedBooking(''); }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          chargeType === 'direct' 
                            ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' 
                            : 'bg-black/20 text-slate-400 border-transparent hover:bg-white/5'
                        }`}
                      >
                        Direct Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setChargeType('room')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          chargeType === 'room' 
                            ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' 
                            : 'bg-black/20 text-slate-400 border-transparent hover:bg-white/5'
                        }`}
                      >
                        Charge to Room
                      </button>
                    </div>
                  </div>

                  {chargeType === 'direct' ? (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Guest Name</label>
                        <input 
                          type="text"
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          placeholder="e.g., Walk-in Customer"
                          className="w-full px-3 py-2 bg-[#0f1115] text-white text-xs rounded-lg border border-white/10 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0f1115] text-white text-xs rounded-lg border border-white/10 focus:border-blue-500 outline-none"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Credit/Debit Card</option>
                          <option value="upi">UPI / QR Code</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select Active Checked-In Room</label>
                        <select
                          value={selectedBooking}
                          onChange={e => setSelectedBooking(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0f1115] text-white text-xs rounded-lg border border-white/10 focus:border-blue-500 outline-none"
                        >
                          <option value="">-- Choose Guest Room --</option>
                          {activeBookings.map(b => (
                            <option key={b._id} value={b._id}>
                              Room {b.roomId?.roomNumber} - {b.guestName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Panel */}
                <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    disabled={isSubmittingOrder || cart.length === 0}
                    onClick={() => handlePlaceOrder('draft')}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl font-bold text-xs uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hold Order (Draft)
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingOrder || cart.length === 0}
                    onClick={() => handlePlaceOrder('completed')}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingOrder ? 'Billed...' : 'Complete & Bill'}
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================
              TAB: COMPLETED POS ORDERS
             ======================================================== */}
          {activeTab === 'orders' && (
            <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-xl font-bold text-white">Completed POS Orders</h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 text-slate-400 font-bold border-b border-white/5 uppercase tracking-wider text-[10px]">
                      <th className="p-4">Order Number</th>
                      <th className="p-4">Outlet</th>
                      <th className="p-4">Guest Name</th>
                      <th className="p-4">Room No</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-slate-200">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-500 italic">
                          No billed orders found. Start billing in the "POS Creation" tab.
                        </td>
                      </tr>
                    ) : (
                      orders.map(order => (
                        <tr key={order._id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-blue-400">{order.orderNumber}</td>
                          <td className="p-4">{order.posOutletId?.name || 'N/A'}</td>
                          <td className="p-4">{order.guestName}</td>
                          <td className="p-4">{order.roomNumber || '-'}</td>
                          <td className="p-4">{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                              order.paymentMethod === 'room_charge' 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                              {order.paymentMethod === 'room_charge' ? 'Room Charge' : order.paymentMethod}
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-white">₹{order.totalAmount.toFixed(2)}</td>
                          <td className="p-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setReceiptOrder(order); setShowReceiptModal(true); }}
                              className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                              title="Print Receipt"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => handleVoidOrder(order._id)}
                              className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                              title="Void Bill"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB: HELD ORDERS
             ======================================================== */}
          {activeTab === 'hold' && (
            <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-xl font-bold text-white">Pending Hold Orders</h3>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 text-slate-400 font-bold border-b border-white/5 uppercase tracking-wider text-[10px]">
                      <th className="p-4">Hold Reference</th>
                      <th className="p-4">Outlet</th>
                      <th className="p-4">Reference Guest</th>
                      <th className="p-4">Reference Room</th>
                      <th className="p-4">Hold Date</th>
                      <th className="p-4 text-right">Estimate</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-slate-200">
                    {heldOrders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-500 italic">
                          No held orders found.
                        </td>
                      </tr>
                    ) : (
                      heldOrders.map(order => (
                        <tr key={order._id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-amber-400">{order.orderNumber}</td>
                          <td className="p-4">{order.posOutletId?.name || 'N/A'}</td>
                          <td className="p-4">{order.guestName}</td>
                          <td className="p-4">{order.roomNumber || '-'}</td>
                          <td className="p-4">{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                          <td className="p-4 text-right font-black text-white">₹{order.totalAmount.toFixed(2)}</td>
                          <td className="p-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRetrieveOrder(order)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                            >
                              Retrieve & Bill
                            </button>
                            <button
                              onClick={() => handleVoidOrder(order._id)}
                              className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                              title="Delete Draft"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB: POS INVENTORY (STOCK AUDIT & WASTAGE LOGS)
             ======================================================== */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
              
              {/* Left Panel: Stock Audit - 7 Cols */}
              <div className="lg:col-span-7 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <Package className="mr-2 text-blue-500" size={20} /> Stock Audit
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Physical items tracking count and threshold limits</p>
                  </div>
                  <button
                    onClick={() => {
                      if (items.filter(it => it.trackInventory).length === 0) {
                        return toast.error('No items configured for inventory tracking first.');
                      }
                      setAdjustStockForm({ itemId: items.filter(it => it.trackInventory)[0]?._id || '', quantityToAdd: '' });
                      setIsAdjustingStock(true);
                    }}
                    className="flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md self-start sm:self-auto"
                  >
                    <Plus size={14} className="mr-1.5" /> Adjust Stock
                  </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/5 text-slate-400 font-bold border-b border-white/5 uppercase tracking-wider text-[10px]">
                        <th className="p-3">Item Name</th>
                        <th className="p-3">Outlet</th>
                        <th className="p-3 text-right">In Stock</th>
                        <th className="p-3 text-center">Threshold</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold text-slate-200">
                      {items.filter(it => it.trackInventory).map(product => {
                        const isOutOfStock = product.stockQuantity <= 0;
                        const isLowStock = product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0;
                        
                        return (
                          <tr key={product._id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-white block">{product.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{product.category}</span>
                            </td>
                            <td className="p-3 text-slate-400">{product.posOutletId?.name || 'N/A'}</td>
                            <td className="p-3 text-right font-sans font-black text-white">{product.stockQuantity}</td>
                            <td className="p-3 text-center font-sans font-medium text-slate-400">{product.lowStockThreshold}</td>
                            <td className="p-3 text-center">
                              {isOutOfStock ? (
                                <span className="px-2 py-0.5 rounded text-[9px] uppercase font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  Out of Stock
                                </span>
                              ) : isLowStock ? (
                                <span className="px-2 py-0.5 rounded text-[9px] uppercase font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] uppercase font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  In Stock
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  setAdjustStockForm({ itemId: product._id, quantityToAdd: '' });
                                  setIsAdjustingStock(true);
                                }}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-xs text-slate-200 rounded-lg border border-white/10 transition-colors"
                              >
                                Adjust
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {items.filter(it => it.trackInventory).length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-500 italic">
                            No inventory-tracked items found. Enable inventory tracking on items in the "POS Order Items" tab.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Panel: Wastage Logs - 5 Cols */}
              <div className="lg:col-span-5 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <Archive className="mr-2 text-rose-500" size={20} /> Wastage & Spoilage
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Logs of expired, damaged or wasted goods</p>
                  </div>
                  <button
                    onClick={() => {
                      if (outlets.length === 0) return toast.error('Create a POS outlet first');
                      const trackedItems = items.filter(it => it.trackInventory);
                      if (trackedItems.length === 0) return toast.error('Configure tracked items first');
                      
                      setWastageForm({
                        posOutletId: trackedItems[0].posOutletId?._id || trackedItems[0].posOutletId || outlets[0]._id,
                        itemId: trackedItems[0]._id,
                        quantity: '',
                        reason: 'expired',
                        notes: ''
                      });
                      setIsAddingWastage(true);
                    }}
                    className="flex items-center px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <AlertTriangle size={14} className="mr-1.5" /> Log Spoilage
                  </button>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {wastageLogs.map(log => (
                    <div key={log._id} className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white text-xs">{log.itemId?.name || 'Deleted Item'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{log.posOutletId?.name || 'POS Outlet'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${
                          log.reason === 'expired' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          log.reason === 'broken' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          log.reason === 'spilled' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          log.reason === 'stolen' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-slate-500/10 text-slate-450 border border-slate-500/20'
                        }`}>
                          {log.reason}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-450 font-medium">Logged on: {new Date(log.createdAt).toLocaleDateString('en-GB')}</span>
                        <span className="text-rose-400 font-black">Qty Wasted: {log.quantity}</span>
                      </div>
                      
                      {log.notes && (
                        <div className="bg-[#0f1115] p-2 rounded-lg text-[10px] text-slate-300 italic border border-white/5 font-serif">
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                  {wastageLogs.length === 0 && (
                    <p className="text-center text-slate-500 italic text-xs py-12">No wastage or spoilage logged yet.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              TAB: CONFIG / POS ORDER ITEMS
             ======================================================== */}
          {activeTab === 'items' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Outlets Listing & Configuration - 5 Cols */}
              <div className="lg:col-span-5 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-base font-bold text-white">POS Outlets Setup</h3>
                  <button
                    onClick={() => { setEditingOutlet(null); setOutletForm({ name: '', description: '' }); setIsAddingOutlet(true); }}
                    className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-slate-300 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {outlets.map(o => (
                    <div key={o._id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                      <div>
                        <p className="font-bold text-white text-xs">{o.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{o.description || 'No description'}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditOutlet(o)}
                          className="p-1 bg-white/5 border border-white/10 rounded text-slate-300 hover:text-white"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteOutlet(o._id)}
                          className="p-1 bg-rose-500/10 border border-rose-500/20 rounded text-rose-450 hover:bg-rose-500 hover:text-white"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {outlets.length === 0 && (
                    <p className="text-center text-slate-500 italic text-xs py-8">No outlets created.</p>
                  )}
                </div>
              </div>

              {/* Items Listing & Configuration - 7 Cols */}
              <div className="lg:col-span-7 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-base font-bold text-white">Products / Items Config</h3>
                  <button
                    onClick={() => { setEditingItem(null); setItemForm({ name: '', price: '', taxRate: '5', category: 'Food', posOutletId: selectedOutlet }); setIsAddingItem(true); }}
                    className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-slate-300 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar max-h-[350px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/5 text-slate-400 font-bold border-b border-white/5 uppercase tracking-wider text-[10px]">
                        <th className="p-3">Item Name</th>
                        <th className="p-3">Outlet</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-center">Tax</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold text-slate-200">
                      {items.map(product => (
                        <tr key={product._id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-bold text-white">{product.name}</td>
                          <td className="p-3 text-slate-400">{product.posOutletId?.name || 'N/A'}</td>
                          <td className="p-3 text-blue-400">{product.category}</td>
                          <td className="p-3 text-right">₹{product.price.toFixed(2)}</td>
                          <td className="p-3 text-center">{product.taxRate}%</td>
                          <td className="p-3 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditItem(product)}
                              className="p-1 bg-white/5 border border-white/10 rounded text-slate-350 hover:text-white"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(product._id)}
                              className="p-1 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 hover:bg-rose-500 hover:text-white"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-500 italic">No menu items created.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </>
      )}

      {/* ========================================================
          MODAL: ADD/EDIT POS OUTLET
         ======================================================== */}
      {isAddingOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddingOutlet(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsAddingOutlet(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">
              {editingOutlet ? 'Edit POS Outlet' : 'Create POS Outlet'}
            </h3>
            
            <form onSubmit={handleCreateOutlet} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Outlet Name</label>
                <input
                  type="text"
                  required
                  value={outletForm.name}
                  onChange={e => setOutletForm({ ...outletForm, name: e.target.value })}
                  placeholder="e.g. In-house Restaurant, Spa, Room Service"
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</label>
                <textarea
                  value={outletForm.description}
                  onChange={e => setOutletForm({ ...outletForm, description: e.target.value })}
                  placeholder="Enter details about this outlet..."
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-sm resize-none h-24"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm"
              >
                {editingOutlet ? 'Save Changes' : 'Create Outlet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD/EDIT POS ITEM
         ======================================================== */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddingItem(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsAddingItem(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 font-sans">
              {editingItem ? 'Edit Menu Item' : 'Create Menu Item'}
            </h3>
            
            <form onSubmit={handleCreateItem} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">POS Outlet</label>
                <select
                  value={itemForm.posOutletId}
                  onChange={e => setItemForm({ ...itemForm, posOutletId: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Select Outlet --</option>
                  {outlets.map(o => (
                    <option key={o._id} value={o._id}>{o.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Item Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Club Sandwich, Spa Massage"
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Base Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={itemForm.price}
                    onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                    placeholder="250.00"
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-right font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">GST Rate (%)</label>
                  <select
                    value={itemForm.taxRate}
                    onChange={e => setItemForm({ ...itemForm, taxRate: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="0">0% (GST Exempt)</option>
                    <option value="5">5% (General Food)</option>
                    <option value="12">12% (Processed Goods)</option>
                    <option value="18">18% (Standard Services)</option>
                    <option value="28">28% (Luxury Goods)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Category</label>
                <input
                  type="text"
                  required
                  value={itemForm.category}
                  onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                  placeholder="Food, Beverage, Laundry, Spa"
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="trackInventory"
                  checked={itemForm.trackInventory}
                  onChange={e => setItemForm({ ...itemForm, trackInventory: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-[#0f1115] text-blue-600 focus:ring-blue-500 focus:ring-offset-[#13151a]"
                />
                <label htmlFor="trackInventory" className="text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer">
                  Track Stock Inventory
                </label>
              </div>

              {itemForm.trackInventory && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Current Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={itemForm.stockQuantity}
                      onChange={e => setItemForm({ ...itemForm, stockQuantity: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Low Stock Limit</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={itemForm.lowStockThreshold}
                      onChange={e => setItemForm({ ...itemForm, lowStockThreshold: parseInt(e.target.value) || 0 })}
                      placeholder="5"
                      className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none font-bold"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm"
              >
                {editingItem ? 'Save Changes' : 'Create Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RECEIPT / INVOICE VIEW
         ======================================================== */}
      {showReceiptModal && receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowReceiptModal(false)}></div>
          <div className="relative bg-white border border-slate-350 text-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowReceiptModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors">
              <X size={24} />
            </button>
            
            {/* Receipt Printable Format */}
            <div id="pos-print-area" className="space-y-6 font-mono text-xs text-left">
              <div className="text-center space-y-1.5 pb-4 border-b border-dashed border-slate-300">
                <h2 className="text-xl font-black tracking-tight text-slate-900">RESERVA360 POS</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">POINT OF SALE RECEIPT</p>
                <p className="text-[10px] text-slate-500">Outlet: {receiptOrder.posOutletId?.name || 'POS Outlet'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill No:</span>
                  <span className="font-bold text-slate-900">{receiptOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest:</span>
                  <span className="font-bold text-slate-900">{receiptOrder.guestName}</span>
                </div>
                {receiptOrder.roomNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Room Charged:</span>
                    <span className="font-bold text-slate-900">Room {receiptOrder.roomNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold text-slate-900">{new Date(receiptOrder.createdAt).toLocaleString('en-GB')}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-dashed border-slate-300 pt-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold">
                      <th className="pb-2 text-left">Item Name</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptOrder.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-100 font-semibold text-slate-800">
                        <td className="py-2.5 max-w-[150px] truncate">{it.name}</td>
                        <td className="py-2.5 text-center">{it.quantity}</td>
                        <td className="py-2.5 text-right">₹{it.price.toFixed(2)}</td>
                        <td className="py-2.5 text-right">₹{it.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Cart Subtotal</span>
                  <span>₹{receiptOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Taxes (GST)</span>
                  <span>₹{receiptOrder.taxTotal.toFixed(2)}</span>
                </div>
                {receiptOrder.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount</span>
                    <span>-₹{receiptOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span>₹{receiptOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-6 border-t border-dashed border-slate-300 space-y-1">
                <p className="font-bold text-slate-800">THANK YOU FOR YOUR PATRONAGE!</p>
                <p className="text-[10px] text-slate-400">Reserva360 Management</p>
              </div>
            </div>

            {/* Print Action */}
            <div className="mt-8">
              <button
                onClick={() => window.print()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-xs uppercase"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADJUST STOCK
         ======================================================== */}
      {isAdjustingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAdjustingStock(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsAdjustingStock(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Package className="mr-2 text-blue-500" size={20} /> Adjust Inventory Stock
            </h3>
            
            <form onSubmit={handleAdjustStock} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Item</label>
                <select
                  value={adjustStockForm.itemId}
                  onChange={e => setAdjustStockForm({ ...adjustStockForm, itemId: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="">-- Choose Item to Adjust --</option>
                  {items.filter(it => it.trackInventory).map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} (Current Stock: {product.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Adjustment Quantity
                </label>
                <input
                  type="number"
                  required
                  value={adjustStockForm.quantityToAdd}
                  onChange={e => setAdjustStockForm({ ...adjustStockForm, quantityToAdd: e.target.value })}
                  placeholder="e.g., +10 to add, -5 to subtract"
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-right font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                  Enter a positive number to increase stock (e.g. restocking) or negative to decrease (e.g. audit loss).
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm"
              >
                Save Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: RECORD WASTAGE
         ======================================================== */}
      {isAddingWastage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddingWastage(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsAddingWastage(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <AlertTriangle className="mr-2 text-rose-500" size={20} /> Log Spoilage / Wastage
            </h3>
            
            <form onSubmit={handleRecordWastage} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Wasted Item</label>
                <select
                  value={wastageForm.itemId}
                  onChange={e => {
                    const val = e.target.value;
                    const prod = items.find(it => it._id === val);
                    setWastageForm({
                      ...wastageForm,
                      itemId: val,
                      posOutletId: prod ? (prod.posOutletId?._id || prod.posOutletId) : ''
                    });
                  }}
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="">-- Choose Item --</option>
                  {items.filter(it => it.trackInventory).map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} (In Stock: {product.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={wastageForm.quantity}
                    onChange={e => setWastageForm({ ...wastageForm, quantity: e.target.value })}
                    placeholder="1"
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-right font-bold"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Reason</label>
                  <select
                    value={wastageForm.reason}
                    onChange={e => setWastageForm({ ...wastageForm, reason: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="expired">Expired / Stale</option>
                    <option value="broken">Broken / Damaged</option>
                    <option value="spilled">Spilled / Wasted</option>
                    <option value="stolen">Stolen / Missing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Notes / Context</label>
                <textarea
                  value={wastageForm.notes}
                  onChange={e => setWastageForm({ ...wastageForm, notes: e.target.value })}
                  placeholder="e.g. Expired on 10/06, or dropped bottle during service..."
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none resize-none h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20 mt-4 text-sm"
              >
                Log Wastage
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD/EDIT POS TABLE
         ======================================================== */}
      {isAddingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddingTable(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 font-sans">
            <button onClick={() => setIsAddingTable(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">
              {editingTable ? 'Edit POS Table' : 'Create POS Table'}
            </h3>
            
            <form onSubmit={handleCreateTable} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Table Name</label>
                <input
                  type="text"
                  required
                  value={tableForm.name}
                  onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                  placeholder="e.g. Table 1, VIP-1, Bar Table 4"
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Seating Capacity (Pax)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={tableForm.seatingCapacity}
                    onChange={e => setTableForm({ ...tableForm, seatingCapacity: parseInt(e.target.value) || 2 })}
                    placeholder="2"
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-right font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Section</label>
                  <select
                    value={tableForm.section}
                    onChange={e => setTableForm({ ...tableForm, section: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="Main Hall">Main Hall</option>
                    <option value="VIP Section">VIP Section</option>
                    <option value="Bar Area">Bar Area</option>
                    <option value="Terrace">Terrace</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Grid Position X (1-8)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="8"
                    value={tableForm.gridX}
                    onChange={e => setTableForm({ ...tableForm, gridX: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Grid Position Y (1-5)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="5"
                    value={tableForm.gridY}
                    onChange={e => setTableForm({ ...tableForm, gridY: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                    className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none text-right"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm font-bold uppercase"
              >
                {editingTable ? 'Save Table' : 'Create Table'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TRANSFER TABLE ORDER
         ======================================================== */}
      {isTransferringTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsTransferringTable(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 font-sans">
            <button onClick={() => setIsTransferringTable(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Coffee className="mr-2 text-rose-455" size={20} /> Transfer Table Order
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Transfer the active hold order and guests to another vacant table in this outlet.
            </p>
            
            <form onSubmit={handleTransferTable} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">From Table</label>
                <input
                  type="text"
                  disabled
                  value={tables.find(t => t._id === transferForm.fromTableId)?.name || 'Loading origin...'}
                  className="w-full px-4 py-3 bg-white/5 text-slate-400 rounded-xl border border-white/5 outline-none cursor-not-allowed font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Transfer to Target Table</label>
                <select
                  required
                  value={transferForm.toTableId}
                  onChange={e => setTransferForm({ ...transferForm, toTableId: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none cursor-pointer font-bold"
                >
                  <option value="">-- Select Vacant Target Table --</option>
                  {tables
                    .filter(t => t.posOutletId === selectedOutlet || t.posOutletId?._id === selectedOutlet)
                    .filter(t => t._id !== transferForm.fromTableId)
                    .map(t => (
                      <option key={t._id} value={t._id} disabled={t.status === 'occupied'}>
                        {t.name} (Section: {t.section} | Capacity: {t.seatingCapacity}) {t.status === 'occupied' ? '[Occupied]' : ''}
                      </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm font-bold uppercase"
              >
                Confirm Table Transfer
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PosManagement;
