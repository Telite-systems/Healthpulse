# ============================================
# Dashboard Routes
# GET /api/dashboard/stats
# GET /api/dashboard/charts
# ============================================

from fastapi import APIRouter, Depends
from app.services.auth import get_current_user
from app.database import database
import time
import random

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get aggregated dashboard statistics."""
    patients_col = database.get_collection("patients")
    appointments_col = database.get_collection("appointments")
    billing_col = database.get_collection("billing")
    doctors_col = database.get_collection("doctors")

    total_patients = await patients_col.count_documents({})
    today_appointments = await appointments_col.count_documents({})
    total_doctors = await doctors_col.count_documents({})
    active_doctors = await doctors_col.count_documents({"status": "Available"})

    # Calculate monthly revenue
    billing_cursor = billing_col.find({})
    monthly_revenue = 0
    pending_bills = 0
    async for bill in billing_cursor:
        monthly_revenue += bill.get("total", 0)
        if bill.get("status") in ("Pending", "Overdue"):
            pending_bills += 1

    stats = {
        "totalPatients": total_patients,
        "todayAppointments": today_appointments,
        "monthlyRevenue": monthly_revenue,
        "activeDoctors": active_doctors,
        "totalDoctors": total_doctors,
        "occupancyRate": 72 + random.randint(0, 15),
        "pendingBills": pending_bills,
    }

    return {
        "data": stats,
        "status": 200,
        "message": "Success",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }


@router.get("/charts")
async def get_chart_data(current_user: dict = Depends(get_current_user)):
    """Get chart data for dashboard visualizations."""
    chart_data = {
        "dailyPatients": {
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "data": [35, 42, 38, 45, 50, 28, 22],
        },
        "revenue": {
            "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            "data": [95000, 105000, 112000, 128500, 118000, 135000],
        },
        "appointments": {
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "data": [28, 35, 32, 40, 42, 18, 15],
        },
        "departmentVisits": {
            "labels": ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Surgery", "Emergency"],
            "data": [180, 120, 150, 95, 110, 200],
        },
    }

    return {
        "data": chart_data,
        "status": 200,
        "message": "Success",
        "timestamp": int(time.time() * 1000),
        "requestId": f"req_{int(time.time())}",
    }
