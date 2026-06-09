# ============================================
# Pharmacy Vendor, Order and Inventory Routes
# ============================================

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import time
import uuid
from datetime import datetime

from app.database import database
from app.services.auth import get_current_user
from app.models.vendor import (
    VendorCreate, VendorUpdate,
    MedicineOrderCreate, MedicineOrderUpdate,
    InventoryCreate, InventoryUpdate
)
from app.routes.websocket import manager

router = APIRouter(prefix="/api", tags=["Pharmacy Vendor Ecosystem"])

def make_api_response(data, status_code=200, message="Success"):
    """Wrap data in standard HealthPulse response format."""
    return {
        "data": data,
        "status": status_code,
        "message": message,
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}_{uuid.uuid4().hex[:4]}",
    }

async def send_system_notification(title: str, message: str, patient_name: str, type_str: str = "info"):
    """Helper to save a notification in DB and broadcast via WebSockets."""
    notifs_col = database.get_collection("notifications")
    notif_id = f"N{uuid.uuid4().hex[:6].upper()}"
    notif_doc = {
        "_id": notif_id,
        "title": title,
        "message": message,
        "type": type_str,
        "time": "Just now",
        "read": False,
        "patientName": patient_name
    }
    try:
        await notifs_col.insert_one(notif_doc)
        
        # Broadcast via WebSocket
        ws_event = {
            "id": f"ws_{int(time.time() * 1000)}",
            "type": "billing_event" if type_str == "success" else "system_event",
            "title": title,
            "message": message,
            "severity": "success" if type_str == "success" else "warning" if type_str == "warning" else "info",
            "timestamp": int(time.time() * 1000)
        }
        await manager.broadcast(ws_event)
    except Exception as e:
        print(f"Error sending notification: {e}")


# ─── Vendor Endpoints (Admin Controlled) ───────────────────────────────────────

@router.get("/vendors", response_model=dict)
async def get_all_vendors(
    current_user: dict = Depends(get_current_user)
):
    """Get list of all vendors in system."""
    vendors_col = database.get_collection("vendors")
    cursor = vendors_col.find({})
    vendors = []
    async for v in cursor:
        v["id"] = v.pop("_id")
        vendors.append(v)
    return make_api_response(vendors)

@router.get("/vendors/{vendor_id}", response_model=dict)
async def get_vendor_by_id(
    vendor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single vendor profile by ID."""
    vendors_col = database.get_collection("vendors")
    vendor = await vendors_col.find_one({"_id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor["id"] = vendor.pop("_id")
    return make_api_response(vendor)

@router.post("/vendors", response_model=dict)
async def create_vendor(
    vendor_data: VendorCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register a new vendor (Admin only)."""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can register vendors")
    
    vendors_col = database.get_collection("vendors")
    users_col = database.get_collection("users")
    
    # Check duplicate username
    existing_user = await users_col.find_one({"username": vendor_data.username.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    vendor_id = vendor_data.id or f"VND{uuid.uuid4().hex[:4].upper()}"
    
    # Save user record for auth
    from app.services.auth import hash_password
    await users_col.insert_one({
        "_id": vendor_id,
        "username": vendor_data.username.lower(),
        "hashed_password": hash_password("vendor123"),  # default password
        "name": vendor_data.name,
        "role": "Vendor",
        "avatar": "💊",
        "status": "Active"
    })
    
    # Save vendor details
    vendor_doc = vendor_data.model_dump(exclude={"id"})
    vendor_doc["_id"] = vendor_id
    vendor_doc["username"] = vendor_data.username.lower()
    await vendors_col.insert_one(vendor_doc)
    
    vendor_doc["id"] = vendor_doc.pop("_id")
    return make_api_response(vendor_doc, 201, "Vendor registered successfully")

@router.put("/vendors/{vendor_id}", response_model=dict)
async def update_vendor(
    vendor_id: str,
    updates: VendorUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update vendor profile (Admin only)."""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can update vendors")
        
    vendors_col = database.get_collection("vendors")
    
    update_data = {k: v for k, v in updates.model_dump(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update")
        
    res = await vendors_col.update_one({"_id": vendor_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    updated = await vendors_col.find_one({"_id": vendor_id})
    updated["id"] = updated.pop("_id")
    return make_api_response(updated)

@router.delete("/vendors/{vendor_id}", response_model=dict)
async def delete_vendor(
    vendor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete or suspend a vendor (Admin only)."""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can delete vendors")
        
    vendors_col = database.get_collection("vendors")
    users_col = database.get_collection("users")
    
    # Hard delete from both users and vendors
    await users_col.delete_one({"_id": vendor_id})
    res = await vendors_col.delete_one({"_id": vendor_id})
    
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    return make_api_response({"deleted": True})


# ─── Medicine Order Endpoints ───────────────────────────────────────────────

@router.get("/orders", response_model=dict)
async def get_orders(
    current_user: dict = Depends(get_current_user)
):
    """List orders with access restriction depending on user role."""
    orders_col = database.get_collection("medicine_orders")
    query = {}
    
    # Filter based on role
    role = current_user.get("role")
    user_id = current_user.get("id")
    name = current_user.get("name")
    
    if role == "Vendor":
        query = {"vendorId": user_id}
    elif role == "Patient":
        # Check patientName or patientId match
        query = {
            "$or": [
                {"patientId": user_id},
                {"patientName": name}
            ]
        }
    
    cursor = orders_col.find(query).sort("_id", -1)
    orders = []
    async for order in cursor:
        order["id"] = order.pop("_id")
        orders.append(order)
        
    return make_api_response(orders)

@router.get("/orders/{order_id}", response_model=dict)
async def get_order_by_id(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single order details by ID."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Role-based validation
    role = current_user.get("role")
    user_id = current_user.get("id")
    name = current_user.get("name")
    
    if role == "Vendor" and order.get("vendorId") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this order")
    elif role == "Patient" and order.get("patientId") != user_id and order.get("patientName") != name:
        raise HTTPException(status_code=403, detail="Access denied to this order")
        
    order["id"] = order.pop("_id")
    return make_api_response(order)

@router.post("/orders", response_model=dict)
async def create_medicine_order(
    order_data: MedicineOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new medicine order (Patient only)."""
    orders_col = database.get_collection("medicine_orders")
    order_id = order_data.id or f"ORD{uuid.uuid4().hex[:4].upper()}"
    
    order_doc = order_data.model_dump(exclude={"id"})
    order_doc["_id"] = order_id
    order_doc["createdAt"] = order_data.createdAt or datetime.utcnow().isoformat()
    order_doc["status"] = "Created"
    
    await orders_col.insert_one(order_doc)
    
    # Notify Vendor
    await send_system_notification(
        title="📋 New Medicine Order Received",
        message=f"New medicine order {order_id} assigned to you from patient {order_data.patientName}.",
        patient_name=order_data.patientName,
        type_str="info"
    )
    
    order_doc["id"] = order_doc.pop("_id")
    return make_api_response(order_doc, 201, "Order created successfully")

@router.put("/orders/{order_id}", response_model=dict)
async def update_order(
    order_id: str,
    updates: MedicineOrderUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update order details or status."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    update_data = {k: v for k, v in updates.model_dump(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update")
        
    await orders_col.update_one({"_id": order_id}, {"$set": update_data})
    
    updated = await orders_col.find_one({"_id": order_id})
    updated["id"] = updated.pop("_id")
    return make_api_response(updated)


# ─── Order State Transitions ────────────────────────────────────────────────

@router.post("/orders/{order_id}/accept", response_model=dict)
async def accept_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accept the order, update status, and deduct quantities from vendor inventory."""
    orders_col = database.get_collection("medicine_orders")
    inventory_col = database.get_collection("inventory")
    
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Verify vendor owns this order
    if current_user.get("role") == "Vendor" and order.get("vendorId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Check current status
    if order.get("status") not in ["Created", "Assigned"]:
        raise HTTPException(status_code=400, detail="Order is already accepted or processed")
        
    # ── Deduct quantities from inventory ──
    medicines = order.get("medicines", [])
    vendor_id = order.get("vendorId")
    for med in medicines:
        med_name = med.get("name", "")
        qty = med.get("quantity", 0)
        
        # Deduct quantity from matching inventory item
        await inventory_col.update_one(
            {"vendorId": vendor_id, "medicineName": {"$regex": f"^{med_name}$", "$options": "i"}},
            {"$inc": {"quantity": -qty}}
        )
        
    # Update status
    await orders_col.update_one({"_id": order_id}, {"$set": {"status": "Accepted", "deliveryEta": "30-45 min"}})
    
    # Notify Patient
    await send_system_notification(
        title="✅ Medicine Order Accepted",
        message=f"Your order {order_id} has been accepted by {order.get('vendorName')} and is being prepared.",
        patient_name=order.get("patientName"),
        type_str="success"
    )
    
    updated_order = await orders_col.find_one({"_id": order_id})
    updated_order["id"] = updated_order.pop("_id")
    
    # Broadcast order status update for patient real-time dashboard
    await manager.broadcast({
        "id": f"order_update_{int(time.time() * 1000)}",
        "type": "order_status_update",
        "title": "Order Status Updated",
        "message": f"Order {order_id} is now Accepted",
        "severity": "success",
        "timestamp": int(time.time() * 1000),
        "data": {
            "order_id": order_id,
            "status": "Accepted",
            "deliveryEta": "30-45 min",
            "vendorName": order.get("vendorName"),
            "patientId": order.get("patientId"),
            "patientName": order.get("patientName")
        }
    })
    
    return make_api_response(updated_order, 200, "Order accepted successfully")

@router.post("/orders/{order_id}/reject", response_model=dict)
async def reject_order(
    order_id: str,
    reason: Optional[dict] = None,
    current_user: dict = Depends(get_current_user)
):
    """Reject the order."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Verify vendor owns this order
    if current_user.get("role") == "Vendor" and order.get("vendorId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    reason_text = reason.get("reason", "Out of stock") if reason else "Out of stock"
    
    # Update status
    await orders_col.update_one({"_id": order_id}, {"$set": {"status": "Rejected", "instructions": f"Rejected: {reason_text}"}})
    
    # Notify Patient
    await send_system_notification(
        title="❌ Medicine Order Rejected",
        message=f"Your order {order_id} was rejected by the pharmacy. Reason: {reason_text}.",
        patient_name=order.get("patientName"),
        type_str="error"
    )
    
    updated_order = await orders_col.find_one({"_id": order_id})
    updated_order["id"] = updated_order.pop("_id")
    return make_api_response(updated_order, 200, "Order rejected")

@router.post("/orders/{order_id}/dispatch", response_model=dict)
async def dispatch_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Move order to Out for Delivery state."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Update status transition
    curr_status = order.get("status")
    next_status = "Out for Delivery"
    if curr_status == "Accepted":
        next_status = "Processing"
    elif curr_status == "Processing":
        next_status = "Ready for Dispatch"
    elif curr_status == "Ready for Dispatch":
        next_status = "Out for Delivery"
        
    # Determine ETA based on status
    eta_map = {
        "Processing": "25-35 min",
        "Ready for Dispatch": "15-20 min",
        "Out for Delivery": "10-15 min"
    }
    eta_value = eta_map.get(next_status, order.get("deliveryEta", "30-45 min"))
    
    await orders_col.update_one({"_id": order_id}, {"$set": {"status": next_status, "deliveryEta": eta_value}})
    
    # Notify Patient on dispatch
    if next_status == "Out for Delivery":
        await send_system_notification(
            title="🚚 Order Out for Delivery",
            message=f"Your medicine package from {order.get('vendorName')} is on its way to your address!",
            patient_name=order.get("patientName"),
            type_str="info"
        )
        # Start real-time GPS tracking simulation task
        import asyncio
        from app.routes.delivery import simulate_delivery_trip
        asyncio.create_task(simulate_delivery_trip(order_id))
    else:
        await send_system_notification(
            title="📦 Order Status Updated",
            message=f"Order {order_id} is now in state: {next_status}.",
            patient_name=order.get("patientName"),
            type_str="info"
        )
    
    updated_order = await orders_col.find_one({"_id": order_id})
    updated_order["id"] = updated_order.pop("_id")
    
    # Broadcast order status update for patient real-time dashboard
    await manager.broadcast({
        "id": f"order_update_{int(time.time() * 1000)}",
        "type": "order_status_update",
        "title": "Order Status Updated",
        "message": f"Order {order_id} is now {next_status}",
        "severity": "info",
        "timestamp": int(time.time() * 1000),
        "data": {
            "order_id": order_id,
            "status": next_status,
            "deliveryEta": eta_value,
            "vendorName": order.get("vendorName"),
            "patientId": order.get("patientId"),
            "patientName": order.get("patientName")
        }
    })
    
    return make_api_response(updated_order)

@router.post("/orders/{order_id}/deliver", response_model=dict)
async def deliver_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark order as delivered."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    await orders_col.update_one({"_id": order_id}, {"$set": {"status": "Delivered", "deliveryEta": "Delivered"}})
    
    # Log analytics
    analytics_col = database.get_collection("vendor_analytics")
    vendor_id = order.get("vendorId")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    amount = order.get("totalAmount", 0.0)
    
    await analytics_col.update_one(
        {"vendorId": vendor_id, "date": today},
        {"$inc": {"dailyOrders": 1, "revenue": amount}},
        upsert=True
    )
    
    # Notify Patient
    await send_system_notification(
        title="🎉 Medicines Delivered!",
        message=f"Order {order_id} has been delivered successfully. Thank you for using HealthPulse!",
        patient_name=order.get("patientName"),
        type_str="success"
    )
    
    updated_order = await orders_col.find_one({"_id": order_id})
    updated_order["id"] = updated_order.pop("_id")
    return make_api_response(updated_order)


# ─── Inventory Endpoints ─────────────────────────────────────────────────────

@router.get("/inventory", response_model=dict)
async def get_inventory(
    current_user: dict = Depends(get_current_user)
):
    """Get inventory list (filtered by vendorId if logged in as a Vendor)."""
    inventory_col = database.get_collection("inventory")
    query = {}
    
    if current_user.get("role") == "Vendor":
        query = {"vendorId": current_user.get("id")}
        
    cursor = inventory_col.find(query).sort("medicineName", 1)
    items = []
    async for item in cursor:
        item["id"] = item.pop("_id")
        items.append(item)
    return make_api_response(items)

@router.post("/inventory", response_model=dict)
async def add_inventory_item(
    item_data: InventoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new medicine item to vendor inventory."""
    inventory_col = database.get_collection("inventory")
    item_id = item_data.id or f"INV{uuid.uuid4().hex[:4].upper()}"
    
    # Enforce current user as vendorId if Vendor
    vendor_id = current_user.get("id") if current_user.get("role") == "Vendor" else item_data.vendorId
    
    item_doc = item_data.model_dump(exclude={"id"})
    item_doc["_id"] = item_id
    item_doc["vendorId"] = vendor_id
    
    await inventory_col.insert_one(item_doc)
    
    item_doc["id"] = item_doc.pop("_id")
    return make_api_response(item_doc, 201, "Inventory item added")

@router.put("/inventory/{item_id}", response_model=dict)
async def update_inventory_item(
    item_id: str,
    updates: InventoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update stock count or price of inventory item."""
    inventory_col = database.get_collection("inventory")
    
    # Check ownership
    query = {"_id": item_id}
    if current_user.get("role") == "Vendor":
        query["vendorId"] = current_user.get("id")
        
    item = await inventory_col.find_one(query)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    update_data = {k: v for k, v in updates.model_dump(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update")
        
    await inventory_col.update_one({"_id": item_id}, {"$set": update_data})
    
    updated = await inventory_col.find_one({"_id": item_id})
    updated["id"] = updated.pop("_id")
    return make_api_response(updated)

@router.delete("/inventory/{item_id}", response_model=dict)
async def delete_inventory_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove item from inventory."""
    inventory_col = database.get_collection("inventory")
    
    # Check ownership
    query = {"_id": item_id}
    if current_user.get("role") == "Vendor":
        query["vendorId"] = current_user.get("id")
        
    res = await inventory_col.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    return make_api_response({"deleted": True})


# ─── Payment Endpoints ────────────────────────────────────────────────────────

@router.post("/orders/{order_id}/initiate-payment", response_model=dict)
async def initiate_payment(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Initiate online payment for an order."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    await orders_col.update_one(
        {"_id": order_id},
        {"$set": {
            "paymentStatus": "Processing",
            "paymentMethod": "Online"
        }}
    )
    
    return make_api_response({
        "orderId": order_id,
        "paymentStatus": "Processing",
        "paymentMethod": "Online"
    }, message="Payment initiated")


@router.post("/orders/{order_id}/verify-payment", response_model=dict)
async def verify_payment(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Simulate payment verification with 90% success rate."""
    import random
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # 90% success, 10% failure
    is_success = random.random() < 0.9
    
    if is_success:
        tx_id = f"TXN{uuid.uuid4().hex[:8].upper()}"
        details = {
            "method": "UPI",
            "upiId": "healthpulse@axisbank",
            "timestamp": datetime.utcnow().isoformat(),
            "gateway": "SimulatedGateway"
        }
        await orders_col.update_one(
            {"_id": order_id},
            {"$set": {
                "paymentStatus": "Paid",
                "transactionId": tx_id,
                "transactionDetails": details
            }}
        )
        return make_api_response({
            "success": True,
            "paymentStatus": "Paid",
            "transactionId": tx_id,
            "transactionDetails": details
        }, message="Payment verified successfully")
    else:
        details = {
            "reason": "Transaction declined by issuing bank (Code: 51)",
            "timestamp": datetime.utcnow().isoformat(),
            "gateway": "SimulatedGateway"
        }
        await orders_col.update_one(
            {"_id": order_id},
            {"$set": {
                "paymentStatus": "Failed",
                "transactionDetails": details
            }}
        )
        return make_api_response({
            "success": False,
            "paymentStatus": "Failed",
            "message": "Payment declined by issuing bank"
        }, message="Payment verification failed")


@router.get("/orders/{order_id}/payment-status", response_model=dict)
async def get_payment_status(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get the current payment status of an order."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    return make_api_response({
        "orderId": order_id,
        "paymentMethod": order.get("paymentMethod"),
        "paymentStatus": order.get("paymentStatus"),
        "transactionId": order.get("transactionId"),
        "transactionDetails": order.get("transactionDetails")
    })


@router.post("/orders/{order_id}/payment-expired", response_model=dict)
async def payment_expired(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Handle timer expiry for online payment."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    await orders_col.update_one(
        {"_id": order_id},
        {"$set": {
            "paymentStatus": "Expired"
        }}
    )
    return make_api_response({"orderId": order_id, "paymentStatus": "Expired"}, message="Payment expired")


@router.post("/orders/{order_id}/retry-payment", response_model=dict)
async def retry_payment(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reset payment status for retrying online payment."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    await orders_col.update_one(
        {"_id": order_id},
        {"$set": {
            "paymentStatus": "Processing",
            "transactionId": "",
            "transactionDetails": None
        }}
    )
    return make_api_response({"orderId": order_id, "paymentStatus": "Processing"}, message="Ready for retry")


@router.post("/orders/{order_id}/switch-to-cod", response_model=dict)
async def switch_to_cod(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Switch an order's payment method from Online to Cash on Delivery."""
    orders_col = database.get_collection("medicine_orders")
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    await orders_col.update_one(
        {"_id": order_id},
        {"$set": {
            "paymentMethod": "COD",
            "paymentStatus": "Pending",
            "transactionId": "",
            "transactionDetails": None
        }}
    )
    return make_api_response({"orderId": order_id, "paymentMethod": "COD", "paymentStatus": "Pending"}, message="Switched to COD successfully")
