import asyncio
import logging
import random
import time
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from app.database import database
from app.services.auth import get_current_user
from app.routes.websocket import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/delivery", tags=["Medicine Delivery Tracking"])

# Mock Delivery Riders lookup
DELIVERY_RIDERS = [
    {
        "id": "DP001",
        "name": "Rohit Sharma",
        "vehicle_type": "Bike Delivery",
        "vehicle_number": "UP75 AB 1234",
        "avatar": "🚴‍♂️",
        "phone": "+91-9876543210"
    },
    {
        "id": "DP002",
        "name": "Amit Mishra",
        "vehicle_type": "Scooter Delivery",
        "vehicle_number": "MH12 CD 5678",
        "avatar": "🛵",
        "phone": "+91-9876543211"
    },
    {
        "id": "DP003",
        "name": "Jasprit Bumrah",
        "vehicle_type": "Electric Bike",
        "vehicle_number": "DL3C EF 9012",
        "avatar": "🚴",
        "phone": "+91-9876543212"
    }
]

# Coordinate Lookups
VENDORS_COORDS = {
    "V001": {"lat": 28.6304, "lng": 77.2177},  # Metro Pharmacy
    "V002": {"lat": 28.6250, "lng": 77.2200},  # City Care Chemists
    "V003": {"lat": 28.6050, "lng": 77.1950},  # Apollo Pharmacy Express
}

PATIENT_COORDS = {
    "P001": {"lat": 28.6139, "lng": 77.2090},  # Rahul Sharma (MG Road)
    "P002": {"lat": 28.6195, "lng": 77.2010},  # Priya Mehta
    "P003": {"lat": 28.6080, "lng": 77.2150},  # Arjun Patel
    "P004": {"lat": 28.6210, "lng": 77.1990},  # Sunita Verma
}

def get_vendor_location(vendor_id: str) -> dict:
    return VENDORS_COORDS.get(vendor_id, {"lat": 28.6300, "lng": 77.2100})

def get_patient_location(patient_id: str) -> dict:
    return PATIENT_COORDS.get(patient_id, {"lat": 28.6150, "lng": 77.2050})

async def send_system_notification(title: str, message: str, patient_name: str, type_str: str = "info"):
    """Save notification to DB and broadcast via websocket."""
    notifs_col = database.get_collection("notifications")
    notif_id = f"N{uuid.uuid4().hex[:6].upper()}"
    notif_doc = {
        "_id": notif_id,
        "title": title,
        "message": message,
        "type": type_str,
        "time": "Just now",
        "read": False,
        "patientName": patient_name,
        "createdAt": datetime.utcnow().isoformat()
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
        logger.error(f"Error sending delivery notification: {e}")

async def simulate_delivery_trip(order_id: str):
    """Background task to simulate real-time rider GPS movement."""
    logger.info(f"Starting delivery simulation for order: {order_id}")
    
    orders_col = database.get_collection("medicine_orders")
    tracking_col = database.get_collection("delivery_tracking")
    
    order = await orders_col.find_one({"_id": order_id})
    if not order:
        logger.error(f"Order {order_id} not found for simulation.")
        return
        
    vendor_id = order.get("vendorId", "V001")
    patient_id = order.get("patientId", "P001")
    patient_name = order.get("patientName", "Patient")
    
    vendor_loc = get_vendor_location(vendor_id)
    patient_loc = get_patient_location(patient_id)
    
    # Assign a random rider
    rider = random.choice(DELIVERY_RIDERS)
    
    # Calculate distance: simple Euclidean approximation in km
    import math
    lat_diff = patient_loc["lat"] - vendor_loc["lat"]
    lng_diff = patient_loc["lng"] - vendor_loc["lng"]
    # 1 degree lat is ~111km, 1 degree lng at Delhi lat is ~98km
    approx_dist = math.sqrt((lat_diff * 111)**2 + (lng_diff * 98)**2)
    # Ensure it's realistic
    total_distance = round(max(0.8, min(4.5, approx_dist)), 2)
    total_eta = int(total_distance * 5) + 3 # e.g. 10 to 15 mins
    
    # Create or update initial tracking document
    tracking_doc = {
        "_id": order_id,
        "order_id": order_id,
        "vendor_id": vendor_id,
        "patient_id": patient_id,
        "delivery_partner_id": rider["id"],
        "delivery_partner_name": rider["name"],
        "delivery_partner_vehicle_type": rider["vehicle_type"],
        "delivery_partner_vehicle_number": rider["vehicle_number"],
        "delivery_partner_avatar": rider["avatar"],
        "delivery_partner_phone": rider["phone"],
        "current_latitude": vendor_loc["lat"],
        "current_longitude": vendor_loc["lng"],
        "eta_minutes": total_eta,
        "distance_remaining": total_distance,
        "delivery_status": "Out for Delivery",
        "last_updated": datetime.utcnow().isoformat()
    }
    
    await tracking_col.replace_one({"_id": order_id}, tracking_doc, upsert=True)
    
    # Notify Patient
    await send_system_notification(
        title="🚚 Medicines Dispatched!",
        message=f"Rider {rider['name']} is on the way with your medicines from {order.get('vendorName')}. ETA: {total_eta} mins.",
        patient_name=patient_name,
        type_str="info"
    )
    
    # Run 10-step simulation
    steps = 10
    nearby_notified = False
    
    for step in range(1, steps + 1):
        await asyncio.sleep(3.0)  # 3 seconds per step
        
        # Check current order status to ensure it hasn't been cancelled/delivered manually
        curr_order = await orders_col.find_one({"_id": order_id})
        if not curr_order or curr_order.get("status") not in ["Out for Delivery", "Arriving Soon"]:
            logger.info(f"Simulation stopped for order {order_id} (status changed manually).")
            return
            
        t = step / steps
        current_lat = vendor_loc["lat"] + t * lat_diff
        current_lng = vendor_loc["lng"] + t * lng_diff
        
        # Add a tiny random jitter to make it look realistic on the map
        if step < steps:
            current_lat += (random.random() - 0.5) * 0.0004
            current_lng += (random.random() - 0.5) * 0.0004
            
        rem_distance = round(total_distance * (1 - t), 2)
        rem_eta = max(1, math.ceil(total_eta * (1 - t)))
        
        status = "Out for Delivery"
        if t >= 0.8:
            status = "Arriving Soon"
            if not nearby_notified:
                nearby_notified = True
                await send_system_notification(
                    title="🛵 Delivery Partner Nearby!",
                    message=f"Your delivery partner {rider['name']} is nearby. Please be ready to collect your medicine package.",
                    patient_name=patient_name,
                    type_str="warning"
                )
                
        if step == steps:
            status = "Delivered"
            rem_distance = 0.0
            rem_eta = 0
            
        # Update DB
        update_fields = {
            "current_latitude": current_lat,
            "current_longitude": current_lng,
            "eta_minutes": rem_eta,
            "distance_remaining": rem_distance,
            "delivery_status": status,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        if step == steps:
            update_fields["delivery_completed_at"] = datetime.utcnow().isoformat()
            
        await tracking_col.update_one({"_id": order_id}, {"$set": update_fields})
        
        # Broadcast real-time update event
        tracking_update = {
            "id": f"delivery_update_{int(time.time()*1000)}",
            "type": "delivery_update",
            "title": "Delivery Status Update",
            "message": f"Order {order_id} is {status}",
            "severity": "success" if status == "Delivered" else "info",
            "timestamp": int(time.time() * 1000),
            "data": {
                "order_id": order_id,
                "current_latitude": current_lat,
                "current_longitude": current_lng,
                "eta_minutes": rem_eta,
                "distance_remaining": rem_distance,
                "delivery_status": status,
                "delivery_partner_id": rider["id"],
                "delivery_partner_name": rider["name"],
                "delivery_partner_vehicle_type": rider["vehicle_type"],
                "delivery_partner_vehicle_number": rider["vehicle_number"],
                "delivery_partner_avatar": rider["avatar"],
                "delivery_partner_phone": rider["phone"]
            }
        }
        await manager.broadcast(tracking_update)
        
        # If final step, complete the order
        if step == steps:
            # Update main order document
            await orders_col.update_one(
                {"_id": order_id},
                {"$set": {
                    "status": "Delivered",
                    "deliveryEta": "Delivered"
                }}
            )
            
            # Log analytics
            analytics_col = database.get_collection("vendor_analytics")
            today = datetime.utcnow().strftime("%Y-%m-%d")
            amount = order.get("totalAmount", 0.0)
            await analytics_col.update_one(
                {"vendorId": vendor_id, "date": today},
                {"$inc": {"dailyOrders": 1, "revenue": amount}},
                upsert=True
            )
            
            # Notify delivered
            await send_system_notification(
                title="🎉 Medicines Delivered successfully!",
                message=f"Order {order_id} from {order.get('vendorName')} has been delivered. Thank you!",
                patient_name=patient_name,
                type_str="success"
            )
            
            logger.info(f"Simulation completed and delivered for order {order_id}")


@router.get("/track/{order_id}")
async def get_delivery_tracking(order_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch tracking information for an order. Creates initial one if missing and dispatched."""
    tracking_col = database.get_collection("delivery_tracking")
    tracking = await tracking_col.find_one({"_id": order_id})
    
    if not tracking:
        # Check if the order is already in 'Out for Delivery' state
        orders_col = database.get_collection("medicine_orders")
        order = await orders_col.find_one({"_id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
            
        if order.get("status") in ["Out for Delivery", "Delivered"]:
            # Auto-initialize tracking details in case dispatch trigger didn't run (or DB seeded orders)
            vendor_id = order.get("vendorId", "V001")
            patient_id = order.get("patientId", "P001")
            vendor_loc = get_vendor_location(vendor_id)
            rider = DELIVERY_RIDERS[0]
            
            tracking_doc = {
                "_id": order_id,
                "order_id": order_id,
                "vendor_id": vendor_id,
                "patient_id": patient_id,
                "delivery_partner_id": rider["id"],
                "delivery_partner_name": rider["name"],
                "delivery_partner_vehicle_type": rider["vehicle_type"],
                "delivery_partner_vehicle_number": rider["vehicle_number"],
                "delivery_partner_avatar": rider["avatar"],
                "delivery_partner_phone": rider["phone"],
                "current_latitude": vendor_loc["lat"],
                "current_longitude": vendor_loc["lng"],
                "eta_minutes": 10,
                "distance_remaining": 1.5,
                "delivery_status": order.get("status"),
                "last_updated": datetime.utcnow().isoformat()
            }
            await tracking_col.insert_one(tracking_doc)
            tracking = tracking_doc
        else:
            raise HTTPException(status_code=400, detail="Order is not out for delivery yet")
            
    # Normalize ID for response formatting
    tracking["id"] = tracking.pop("_id")
    return {"data": tracking, "status": 200, "message": "Success"}


@router.get("/analytics")
async def get_delivery_analytics(current_user: dict = Depends(get_current_user)):
    """Fetch high-level delivery performance metrics for Admin dashboard."""
    orders_col = database.get_collection("medicine_orders")
    
    # Calculate successful vs total dispatched deliveries
    total_orders = await orders_col.count_documents({"status": {"$in": ["Out for Delivery", "Delivered"]}})
    delivered_orders = await orders_col.count_documents({"status": "Delivered"})
    
    # Realistic blend with seeded performance data for premium visualization
    stats = {
        "total_deliveries": total_orders + 142,
        "successful_deliveries": delivered_orders + 138,
        "delayed_deliveries": (total_orders - delivered_orders) + 4,
        "average_delivery_time": 16.8,  # minutes avg
        "vendor_performance": [
            {
                "vendor_id": "V001",
                "vendor_name": "Metro Pharmacy",
                "total_deliveries": 62,
                "avg_time": "15.4 min",
                "fulfillment_rate": "98.4%",
                "status": "Excellent"
            },
            {
                "vendor_id": "V002",
                "vendor_name": "City Care Chemists",
                "total_deliveries": 45,
                "avg_time": "21.2 min",
                "fulfillment_rate": "95.5%",
                "status": "Good"
            },
            {
                "vendor_id": "V003",
                "vendor_name": "Apollo Pharmacy Express",
                "total_deliveries": 35,
                "avg_time": "11.8 min",
                "fulfillment_rate": "99.2%",
                "status": "Excellent"
            }
        ]
    }
    
    return {"data": stats, "status": 200, "message": "Success"}
