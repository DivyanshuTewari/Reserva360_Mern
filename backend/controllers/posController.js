const PosOutlet = require('../models/PosOutlet');
const PosItem = require('../models/PosItem');
const PosOrder = require('../models/PosOrder');
const PosWastage = require('../models/PosWastage');
const PosTable = require('../models/PosTable');
const Booking = require('../models/Booking');
const { recalculateBookingTotals } = require('./adminController');

const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// ==========================================
// POS OUTLET CONTROLLERS
// ==========================================

exports.createOutlet = async (req, res) => {
  try {
    const { name, description } = req.body;
    const hotelId = req.user.hotelId;

    const outlet = await PosOutlet.create({
      hotelId,
      name,
      description
    });

    res.status(201).json(outlet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOutlets = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const outlets = await PosOutlet.find({ hotelId }).sort({ createdAt: -1 });
    res.json(outlets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOutlet = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const hotelId = req.user.hotelId;

    const outlet = await PosOutlet.findOneAndUpdate(
      { _id: req.params.id, hotelId },
      { name, description, status },
      { new: true }
    );

    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOutlet = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const outlet = await PosOutlet.findOneAndDelete({ _id: req.params.id, hotelId });
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
    
    // Also deactivate related items
    await PosItem.updateMany({ posOutletId: req.params.id, hotelId }, { status: 'inactive' });

    res.json({ message: 'Outlet deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// POS ITEM CONTROLLERS
// ==========================================

exports.createItem = async (req, res) => {
  try {
    const { posOutletId, name, price, taxRate, category, trackInventory, stockQuantity, lowStockThreshold } = req.body;
    const hotelId = req.user.hotelId;

    const item = await PosItem.create({
      hotelId,
      posOutletId,
      name,
      price: Number(price),
      taxRate: Number(taxRate || 0),
      category: category || 'General',
      trackInventory: trackInventory || false,
      stockQuantity: Number(stockQuantity || 0),
      lowStockThreshold: Number(lowStockThreshold || 5)
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getItems = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const { outletId } = req.query;
    
    const filter = { hotelId };
    if (outletId) {
      filter.posOutletId = outletId;
    }

    const items = await PosItem.find(filter).populate('posOutletId', 'name').sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { name, price, taxRate, category, status, trackInventory, stockQuantity, lowStockThreshold } = req.body;
    const hotelId = req.user.hotelId;

    const item = await PosItem.findOneAndUpdate(
      { _id: req.params.id, hotelId },
      { 
        name, 
        price: Number(price), 
        taxRate: Number(taxRate || 0), 
        category, 
        status, 
        trackInventory: trackInventory || false,
        stockQuantity: Number(stockQuantity || 0),
        lowStockThreshold: Number(lowStockThreshold || 5)
      },
      { new: true }
    );

    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const item = await PosItem.findOneAndDelete({ _id: req.params.id, hotelId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// POS ORDER CONTROLLERS
// ==========================================

exports.createOrder = async (req, res) => {
  try {
    const { posOutletId, bookingId, guestName, roomNumber, items, discount, paymentMethod, status, tableId, covers } = req.body;
    const hotelId = req.user.hotelId;

    // Check stock levels first for completed orders
    if (status === 'completed') {
      for (const item of items) {
        const product = await PosItem.findOne({ _id: item.itemId, hotelId });
        if (product && product.trackInventory) {
          if (product.stockQuantity < item.quantity) {
            return res.status(400).json({ 
              message: `Insufficient stock for ${item.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}` 
            });
          }
        }
      }
    }

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;
    
    const processedItems = items.map(item => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      const taxRate = Number(item.taxRate || 0);
      
      const itemSubtotalWithoutTax = price * quantity;
      const taxAmount = roundToTwo(itemSubtotalWithoutTax * (taxRate / 100));
      const itemSubtotal = roundToTwo(itemSubtotalWithoutTax + taxAmount);
      
      subtotal += itemSubtotalWithoutTax;
      taxTotal += taxAmount;
      
      return {
        itemId: item.itemId,
        name: item.name,
        price,
        quantity,
        taxRate,
        taxAmount,
        subtotal: itemSubtotal
      };
    });

    const subtotalRounded = roundToTwo(subtotal);
    const taxTotalRounded = roundToTwo(taxTotal);
    const discountVal = Number(discount || 0);
    const totalAmount = roundToTwo(Math.max(0, subtotalRounded + taxTotalRounded - discountVal));

    // Generate unique sequential order number
    const count = await PosOrder.countDocuments({ hotelId });
    const orderNumber = `POS-${1000 + count + 1}`;

    // Determine payment status & method
    let finalPaymentStatus = 'paid';
    if (status === 'draft') {
      finalPaymentStatus = 'pending';
    } else if (paymentMethod === 'room_charge') {
      finalPaymentStatus = 'charged_to_room';
    }

    let tableName = '';
    if (tableId) {
      const table = await PosTable.findOne({ _id: tableId, hotelId });
      if (table) {
        tableName = table.name;
        if (status === 'draft') {
          table.status = 'occupied';
          table.covers = Number(covers || 1);
        } else {
          table.status = 'available';
          table.currentOrderId = null;
          table.covers = 0;
        }
        await table.save();
      }
    }

    const order = await PosOrder.create({
      hotelId,
      posOutletId,
      orderNumber,
      bookingId: bookingId || null,
      guestName: tableId && !guestName ? `${tableName} Active` : guestName,
      roomNumber: roomNumber || '',
      items: processedItems,
      subtotal: subtotalRounded,
      taxTotal: taxTotalRounded,
      discount: discountVal,
      totalAmount,
      paymentMethod: status === 'draft' ? 'cash' : paymentMethod,
      paymentStatus: finalPaymentStatus,
      status: status || 'completed',
      tableId: tableId || null,
      tableName: tableName || '',
      covers: tableId ? Number(covers || 1) : 0
    });

    if (tableId && status === 'draft') {
      await PosTable.findOneAndUpdate(
        { _id: tableId, hotelId },
        { currentOrderId: order._id }
      );
    }

    // Decrement stock levels on Fulfill/Complete order
    if (order.status === 'completed') {
      for (const item of order.items) {
        await PosItem.findOneAndUpdate(
          { _id: item.itemId, hotelId, trackInventory: true },
          { $inc: { stockQuantity: -item.quantity } }
        );
      }
    }

    // If completed room charge order, recalculate room folio totals
    if (order.status === 'completed' && order.paymentMethod === 'room_charge' && bookingId) {
      await recalculateBookingTotals(bookingId, hotelId);
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const { status, outletId } = req.query;

    const filter = { hotelId };
    if (status) filter.status = status;
    if (outletId) filter.posOutletId = outletId;

    const orders = await PosOrder.find(filter)
      .populate('posOutletId', 'name')
      .populate('bookingId', 'guestName roomId')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { items, discount, paymentMethod, status, guestName, roomNumber, bookingId, tableId, covers } = req.body;
    const hotelId = req.user.hotelId;

    const order = await PosOrder.findOne({ _id: req.params.id, hotelId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isNewlyCompleted = status === 'completed' && order.status === 'draft';
    const isUpdatingCompleted = order.status === 'completed' && (status === 'completed' || !status);

    // Check stock availability if finalizing or modifying items
    if (items && (isNewlyCompleted || isUpdatingCompleted)) {
      for (const item of items) {
        const product = await PosItem.findOne({ _id: item.itemId, hotelId });
        if (product && product.trackInventory) {
          // Calculate delta if it was already a completed order
          let oldQty = 0;
          if (isUpdatingCompleted) {
            const oldItem = order.items.find(it => it.itemId.toString() === item.itemId.toString());
            oldQty = oldItem ? oldItem.quantity : 0;
          }
          const delta = item.quantity - oldQty;
          
          if (product.stockQuantity < delta) {
            return res.status(400).json({ 
              message: `Insufficient stock for ${item.name}. Available: ${product.stockQuantity}, Requested delta: ${delta}` 
            });
          }
        }
      }
    }

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;
    let processedItems = order.items;

    if (items) {
      processedItems = items.map(item => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        const taxRate = Number(item.taxRate || 0);
        
        const itemSubtotalWithoutTax = price * quantity;
        const taxAmount = roundToTwo(itemSubtotalWithoutTax * (taxRate / 100));
        const itemSubtotal = roundToTwo(itemSubtotalWithoutTax + taxAmount);
        
        subtotal += itemSubtotalWithoutTax;
        taxTotal += taxAmount;
        
        return {
          itemId: item.itemId,
          name: item.name,
          price,
          quantity,
          taxRate,
          taxAmount,
          subtotal: itemSubtotal
        };
      });
    } else {
      // Use existing items to recalculate total
      processedItems.forEach(item => {
        subtotal += (item.price * item.quantity);
        taxTotal += item.taxAmount;
      });
    }

    const subtotalRounded = roundToTwo(subtotal);
    const taxTotalRounded = roundToTwo(taxTotal);
    const discountVal = Number(discount !== undefined ? discount : order.discount);
    const totalAmount = roundToTwo(Math.max(0, subtotalRounded + taxTotalRounded - discountVal));

    const oldBookingId = order.bookingId;
    const wasRoomCharge = order.status === 'completed' && order.paymentMethod === 'room_charge';

    // Handle stock delta adjustment
    if (isNewlyCompleted) {
      // Deduct stock for all items
      for (const item of processedItems) {
        await PosItem.findOneAndUpdate(
          { _id: item.itemId, hotelId, trackInventory: true },
          { $inc: { stockQuantity: -item.quantity } }
        );
      }
    } else if (isUpdatingCompleted && items) {
      // Calculate delta adjustment for each item
      // Restock items that were in old order but missing in new order
      for (const oldIt of order.items) {
        const stillExists = processedItems.find(newIt => newIt.itemId.toString() === oldIt.itemId.toString());
        if (!stillExists) {
          await PosItem.findOneAndUpdate(
            { _id: oldIt.itemId, hotelId, trackInventory: true },
            { $inc: { stockQuantity: oldIt.quantity } }
          );
        }
      }
      
      // Update inventory based on delta for new items
      for (const newIt of processedItems) {
        const oldIt = order.items.find(it => it.itemId.toString() === newIt.itemId.toString());
        const oldQty = oldIt ? oldIt.quantity : 0;
        const delta = newIt.quantity - oldQty;
        
        await PosItem.findOneAndUpdate(
          { _id: newIt.itemId, hotelId, trackInventory: true },
          { $inc: { stockQuantity: -delta } }
        );
      }
    }

    // Update order
    order.items = processedItems;
    order.subtotal = subtotalRounded;
    order.taxTotal = taxTotalRounded;
    order.discount = discountVal;
    order.totalAmount = totalAmount;
    if (guestName) order.guestName = guestName;
    if (roomNumber !== undefined) order.roomNumber = roomNumber;
    if (bookingId !== undefined) order.bookingId = bookingId || null;
    
    if (status) order.status = status;
    
    if (order.status === 'completed') {
      if (paymentMethod) order.paymentMethod = paymentMethod;
      order.paymentStatus = order.paymentMethod === 'room_charge' ? 'charged_to_room' : 'paid';
    } else if (order.status === 'draft') {
      order.paymentStatus = 'pending';
    }

    const oldTableId = order.tableId;
    const newStatus = status || order.status;
    let resolvedTableId = tableId !== undefined ? tableId : order.tableId;
    let resolvedCovers = covers !== undefined ? Number(covers) : order.covers;
    let resolvedTableName = order.tableName;

    if (tableId !== undefined && tableId !== (oldTableId ? oldTableId.toString() : null)) {
      if (oldTableId) {
        await PosTable.findOneAndUpdate(
          { _id: oldTableId, hotelId },
          { status: 'available', currentOrderId: null, covers: 0 }
        );
      }
      if (tableId) {
        const newTable = await PosTable.findOne({ _id: tableId, hotelId });
        if (newTable) {
          resolvedTableName = newTable.name;
          if (newStatus === 'draft') {
            newTable.status = 'occupied';
            newTable.currentOrderId = order._id;
            newTable.covers = resolvedCovers;
            await newTable.save();
          }
        }
      } else {
        resolvedTableName = '';
        resolvedCovers = 0;
      }
    } else if (resolvedTableId) {
      const table = await PosTable.findOne({ _id: resolvedTableId, hotelId });
      if (table) {
        resolvedTableName = table.name;
        if (newStatus === 'completed' || newStatus === 'void') {
          table.status = 'available';
          table.currentOrderId = null;
          table.covers = 0;
        } else if (newStatus === 'draft') {
          table.status = 'occupied';
          table.currentOrderId = order._id;
          table.covers = resolvedCovers;
        }
        await table.save();
      }
    }

    order.tableId = resolvedTableId || null;
    order.tableName = resolvedTableName || '';
    order.covers = resolvedTableId ? resolvedCovers : 0;

    await order.save();

    // Folio adjustments
    const isRoomCharge = order.status === 'completed' && order.paymentMethod === 'room_charge';
    
    if (wasRoomCharge && oldBookingId) {
      // Re-evaluate old booking total
      await recalculateBookingTotals(oldBookingId, hotelId);
    }
    if (isRoomCharge && order.bookingId) {
      // Evaluate new booking total
      await recalculateBookingTotals(order.bookingId, hotelId);
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    
    const order = await PosOrder.findOne({ _id: req.params.id, hotelId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const wasCompleted = order.status === 'completed';

    // Void instead of direct delete to maintain audit log
    order.status = 'void';
    order.paymentStatus = 'void';
    await order.save();

    // Free the table if it was linked
    if (order.tableId) {
      await PosTable.findOneAndUpdate(
        { _id: order.tableId, hotelId },
        { status: 'available', currentOrderId: null, covers: 0 }
      );
    }

    // Restock items if it was completed
    if (wasCompleted) {
      for (const item of order.items) {
        await PosItem.findOneAndUpdate(
          { _id: item.itemId, hotelId, trackInventory: true },
          { $inc: { stockQuantity: item.quantity } }
        );
      }
    }

    // If it was previously charged to room, remove it from PMS folio
    if (order.paymentMethod === 'room_charge' && order.bookingId) {
      await recalculateBookingTotals(order.bookingId, hotelId);
    }

    res.json({ message: 'Order voided successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// POS WASTAGE / SPOILAGE CONTROLLERS
// ==========================================

exports.logWastage = async (req, res) => {
  try {
    const { posOutletId, itemId, quantity, reason, notes } = req.body;
    const hotelId = req.user.hotelId;

    const qty = Number(quantity);
    if (!posOutletId || !itemId || qty <= 0) {
      return res.status(400).json({ message: 'Outlet, item, and positive quantity are required' });
    }

    // Log wastage record
    const wastage = await PosWastage.create({
      hotelId,
      posOutletId,
      itemId,
      quantity: qty,
      reason: reason || 'expired',
      notes: notes || ''
    });

    // Decrement stock level
    await PosItem.findOneAndUpdate(
      { _id: itemId, hotelId, trackInventory: true },
      { $inc: { stockQuantity: -qty } }
    );

    res.status(201).json(wastage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWastageLogs = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const logs = await PosWastage.find({ hotelId })
      .populate('posOutletId', 'name')
      .populate('itemId', 'name category price')
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// POS TABLE & SEAT CONTROLLERS
// ==========================================

exports.createTable = async (req, res) => {
  try {
    const { posOutletId, name, seatingCapacity, section, gridX, gridY } = req.body;
    const hotelId = req.user.hotelId;

    if (!posOutletId || !name) {
      return res.status(400).json({ message: 'Outlet and Table name are required' });
    }

    const table = await PosTable.create({
      hotelId,
      posOutletId,
      name,
      seatingCapacity: Number(seatingCapacity || 2),
      section: section || 'Main Hall',
      gridX: Number(gridX || 0),
      gridY: Number(gridY || 0),
      status: 'available'
    });

    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTables = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const { outletId } = req.query;

    const filter = { hotelId };
    if (outletId) {
      filter.posOutletId = outletId;
    }

    const tables = await PosTable.find(filter).populate('currentOrderId').sort({ name: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const { name, seatingCapacity, section, status, gridX, gridY, covers } = req.body;
    const hotelId = req.user.hotelId;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (seatingCapacity !== undefined) updateFields.seatingCapacity = Number(seatingCapacity);
    if (section !== undefined) updateFields.section = section;
    if (status !== undefined) updateFields.status = status;
    if (gridX !== undefined) updateFields.gridX = Number(gridX);
    if (gridY !== undefined) updateFields.gridY = Number(gridY);
    if (covers !== undefined) updateFields.covers = Number(covers);

    const table = await PosTable.findOneAndUpdate(
      { _id: req.params.id, hotelId },
      updateFields,
      { new: true }
    );

    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const table = await PosTable.findOneAndDelete({ _id: req.params.id, hotelId });
    if (!table) return res.status(404).json({ message: 'Table not found' });

    if (table.currentOrderId) {
      await PosOrder.findOneAndUpdate(
        { _id: table.currentOrderId, hotelId },
        { tableId: null, tableName: '' }
      );
    }

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.transferTableOrder = async (req, res) => {
  try {
    const { fromTableId, toTableId } = req.body;
    const hotelId = req.user.hotelId;
    const orderId = req.params.id;

    if (!fromTableId || !toTableId) {
      return res.status(400).json({ message: 'Origin and Destination tables are required' });
    }

    const order = await PosOrder.findOne({ _id: orderId, hotelId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const targetTable = await PosTable.findOne({ _id: toTableId, hotelId });
    if (!targetTable) return res.status(404).json({ message: 'Target table not found' });
    if (targetTable.status === 'occupied' && targetTable.currentOrderId?.toString() !== orderId) {
      return res.status(400).json({ message: 'Target table is already occupied' });
    }

    const originTable = await PosTable.findOne({ _id: fromTableId, hotelId });
    if (originTable) {
      originTable.status = 'available';
      originTable.currentOrderId = null;
      originTable.covers = 0;
      await originTable.save();
    }

    targetTable.status = 'occupied';
    targetTable.currentOrderId = orderId;
    targetTable.covers = order.covers || 1;
    await targetTable.save();

    order.tableId = toTableId;
    order.tableName = targetTable.name;
    await order.save();

    res.json({ message: 'Order transferred successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
