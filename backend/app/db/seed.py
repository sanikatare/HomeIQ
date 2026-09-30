"""
HomeIQ — Idempotent Development Seed Data across all 20 Normalized Tables.
Populates the 'Sharma-Tare Residence (Pune)' household with realistic,
interconnected assets, appliances, vehicles, documents, warranties,
insurance policies, maintenance records, bills, expenses, inventory,
groceries, clothing, reminders, events, agent runs, and notifications.
"""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import (
    ActionRiskLevel,
    AgentRunStatus,
    ApplianceType,
    AssetCategory,
    AssetStatus,
    BillCategory,
    BillingCycle,
    BillStatus,
    DocumentType,
    EventSeverity,
    ExpenseCategory,
    FuelType,
    GarmentCategory,
    GroceryCategory,
    HouseholdRole,
    InsuranceType,
    LaundryStatus,
    MaintenanceStatus,
    MaintenanceType,
    MeasurementUnit,
    NotificationChannel,
    NotificationStatus,
    ParentHealthRecordCategory,
    ParentHealthRecordStatus,
    PaymentMethod,
    ReminderPriority,
    ReminderStatus,
    StockStatus,
    StorageLocation,
    SubscriptionStatus,
    TravelRecordCategory,
    TravelRecordStatus,
    TravelTransportMode,
    VehicleType,
    WarrantyStatus,
    WarrantyType,
    WashCareMethod,
)
from app.db.models import (
    AgentRun,
    Appliance,
    Asset,
    Bill,
    ClothingItem,
    Document,
    Event,
    Expense,
    GroceryItem,
    Household,
    HouseholdMember,
    InsurancePolicy,
    InventoryItem,
    MaintenanceRecord,
    Notification,
    ParentHealthRecord,
    Reminder,
    Subscription,
    TravelRecord,
    User,
    Vehicle,
    Warranty,
)

# Deterministic Seed UUIDs exported for evaluation and test suites
USER_SANIKA_ID = uuid.UUID("11111111-1111-4111-8111-111111111101")
USER_ROHAN_ID = uuid.UUID("11111111-1111-4111-8111-111111111102")
USER_AARAV_ID = USER_ROHAN_ID
HOUSEHOLD_ID = uuid.UUID("22222222-2222-4222-8222-222222222201")
ASSET_DISHWASHER_ID = uuid.UUID("44444444-4444-4444-8444-444444444401")
ASSET_CAR_ID = uuid.UUID("44444444-4444-4444-8444-444444444402")
ASSET_AC_ID = uuid.UUID("44444444-4444-4444-8444-444444444403")


async def seed_development_data(session: AsyncSession) -> dict[str, uuid.UUID]:
    """
    Populates a complete, relationally linked dataset across all 20 tables.
    Returns a dictionary of primary key UUIDs for test and verification assertions.
    """
    # 1. Users
    sanika = User(
        id=uuid.UUID("11111111-1111-4111-8111-111111111101"),
        email="sanika.tare@homeiq.local",
        full_name="Sanika Tare",
        password_hash="$2b$12$hashed_pbkdf2_sanika_dev_only",
        phone_number="+91-9823011223",
        preferred_locale="en-IN",
        timezone="Asia/Kolkata",
        is_active=True,
    )
    rohan = User(
        id=uuid.UUID("11111111-1111-4111-8111-111111111102"),
        email="rohan.tare@homeiq.local",
        full_name="Rohan Tare",
        password_hash="$2b$12$hashed_pbkdf2_rohan_dev_only",
        phone_number="+91-9823099887",
        preferred_locale="en-IN",
        timezone="Asia/Kolkata",
        is_active=True,
    )
    session.add_all([sanika, rohan])
    await session.flush()

    # 2. Household
    household = Household(
        id=uuid.UUID("22222222-2222-4222-8222-222222222201"),
        name="Tare-Sharma Residence (Kothrud, Pune)",
        slug="tare-sharma-pune",
        currency_code="INR",
        timezone="Asia/Kolkata",
        city="Pune",
        state_region="Maharashtra",
        country_code="IN",
        monthly_budget_minor=8500000,  # ₹85,000.00 in paise
        created_by_id=sanika.id,
        updated_by_id=sanika.id,
    )
    session.add(household)
    await session.flush()

    # 3. Household Members
    member_sanika = HouseholdMember(
        id=uuid.UUID("33333333-3333-4333-8333-333333333301"),
        household_id=household.id,
        user_id=sanika.id,
        role=HouseholdRole.OWNER,
        nickname="Sanika",
        can_approve_agent_actions=True,
        is_primary_contact=True,
        created_by_id=sanika.id,
    )
    member_rohan = HouseholdMember(
        id=uuid.UUID("33333333-3333-4333-8333-333333333302"),
        household_id=household.id,
        user_id=rohan.id,
        role=HouseholdRole.ADMIN,
        nickname="Rohan",
        can_approve_agent_actions=True,
        is_primary_contact=False,
        created_by_id=sanika.id,
    )
    session.add_all([member_sanika, member_rohan])
    await session.flush()

    # 4. Assets (1 Appliance Asset + 1 Vehicle Asset)
    asset_dishwasher = Asset(
        id=uuid.UUID("44444444-4444-4444-8444-444444444401"),
        household_id=household.id,
        asset_tag="AST-KIT-DW01",
        name="Bosch Series 6 14-Place Dishwasher",
        category=AssetCategory.APPLIANCE,
        status=AssetStatus.ACTIVE,
        brand="Bosch",
        model_number="SMS66GI01I",
        serial_number="BSH-IN-2025-88412",
        location_in_home="Main Kitchen Utility Bay",
        purchase_date=date(2025, 4, 15),
        purchase_price_minor=5490000,  # ₹54,900.00
        vendor_name="Croma Aundh Pune",
        expected_lifespan_months=120,
        created_by_id=sanika.id,
    )
    asset_car = Asset(
        id=uuid.UUID("44444444-4444-4444-8444-444444444402"),
        household_id=household.id,
        asset_tag="AST-VEH-HC01",
        name="Honda City e:HEV ZX Hybrid",
        category=AssetCategory.VEHICLE,
        status=AssetStatus.ACTIVE,
        brand="Honda",
        model_number="City e:HEV ZX",
        serial_number="MAKGM684ACA102938",
        location_in_home="Basement Parking Slot B-14",
        purchase_date=date(2024, 11, 10),
        purchase_price_minor=205000000,  # ₹20,50,000.00
        vendor_name="Deccan Honda Pimpri",
        expected_lifespan_months=180,
        created_by_id=sanika.id,
    )
    asset_ac = Asset(
        id=ASSET_AC_ID,
        household_id=household.id,
        asset_tag="AST-HVAC-AC01",
        name="Daikin 1.5 Ton 5-Star Inverter Split AC",
        category=AssetCategory.HVAC_CLIMATE,
        status=AssetStatus.ACTIVE,
        brand="Daikin",
        model_number="FTKM50UV16V",
        serial_number="DKN-IN-2025-11092",
        location_in_home="Master Bedroom",
        purchase_date=date(2025, 3, 20),
        purchase_price_minor=4200000,  # ₹42,000.00
        vendor_name="Vijay Sales Kothrud",
        expected_lifespan_months=120,
        created_by_id=sanika.id,
    )
    session.add_all([asset_dishwasher, asset_car, asset_ac])
    await session.flush()

    # 5. Appliances (1-to-1 specialization of asset_dishwasher)
    appliance_dishwasher = Appliance(
        household_id=household.id,
        asset_id=asset_dishwasher.id,
        appliance_type=ApplianceType.DISHWASHER,
        energy_star_rating=5,
        rated_wattage=2400,
        service_interval_days=180,
        last_serviced_date=date(2026, 4, 10),
        next_service_due_date=date(2026, 10, 10),
        smart_integration_id="homeconnect://bosch/SMS66GI01I",
        created_by_id=sanika.id,
    )
    session.add(appliance_dishwasher)

    # 6. Vehicles (1-to-1 specialization of asset_car)
    vehicle_city = Vehicle(
        household_id=household.id,
        asset_id=asset_car.id,
        vehicle_type=VehicleType.CAR,
        registration_number="MH-12-vital-4590".upper(),
        vin_chassis_number="MAKGM684ACA102938",
        engine_or_motor_number="LEB8-4410921",
        fuel_type=FuelType.HYBRID,
        manufacturing_year=2024,
        odometer_km=18450,
        service_interval_km=10000,
        last_service_odometer_km=10120,
        pollution_cert_expiry_date=date(2026, 11, 9),
        registration_valid_until=date(2039, 11, 9),
        created_by_id=rohan.id,
    )
    session.add(vehicle_city)

    # 7. Inventory Items
    inv_rice = InventoryItem(
        id=uuid.UUID("77777777-7777-4777-8777-777777777701"),
        household_id=household.id,
        name="Indrayani Organic Rice",
        sku_or_barcode="IN-ORG-IND-5KG",
        category=GroceryCategory.GRAINS_PULSES,
        storage_location=StorageLocation.PANTRY,
        quantity_on_hand=Decimal("1.250"),
        unit=MeasurementUnit.KILOGRAM,
        reorder_threshold=Decimal("2.000"),
        stock_status=StockStatus.LOW_STOCK,
        expiry_date=date(2027, 3, 15),
        created_by_id=sanika.id,
    )
    session.add(inv_rice)
    await session.flush()

    # 8. Grocery Items (linked to low-stock inventory item)
    grocery_rice = GroceryItem(
        household_id=household.id,
        inventory_item_id=inv_rice.id,
        name="Indrayani Organic Rice (5kg Bag)",
        category=GroceryCategory.GRAINS_PULSES,
        planned_quantity=Decimal("5.000"),
        unit=MeasurementUnit.KILOGRAM,
        estimated_unit_price_minor=42000,  # ₹420.00
        preferred_store="Dorabjee's Kothrud",
        is_purchased=False,
        added_reason="Automatic low-stock threshold trigger (1.25kg <= 2.00kg)",
        created_by_id=sanika.id,
    )
    session.add(grocery_rice)

    # 9. Clothing Items
    clothing_kurta = ClothingItem(
        household_id=household.id,
        owner_member_id=member_sanika.id,
        name="Handloom Chanderi Silk Kurta",
        category=GarmentCategory.ETHNIC_TRADITIONAL,
        fabric_composition="80% Silk, 20% Cotton Zari",
        color_group="Emerald Green",
        wash_care_method=WashCareMethod.DRY_CLEAN_ONLY,
        max_wash_temp_celsius=25,
        can_tumble_dry=False,
        requires_ironing=True,
        laundry_status=LaundryStatus.CLEAN_IN_WARDROBE,
        wear_count_since_wash=1,
        created_by_id=sanika.id,
    )
    session.add(clothing_kurta)

    # 10. Documents (linked to asset_dishwasher & asset_car)
    doc_dishwasher_warranty = Document(
        id=uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01"),
        household_id=household.id,
        asset_id=asset_dishwasher.id,
        title="Bosch Series 6 Official Invoice & 2-Year Warranty Certificate",
        document_type=DocumentType.WARRANTY_CERTIFICATE,
        gcs_uri="gs://homeiq-household-documents-dev/tare-sharma-pune/bosch-sms66gi01i-warranty.pdf",
        mime_type="application/pdf",
        file_size_bytes=482910,
        sha256_checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        extracted_text="Bosch Home Appliances India. Model SMS66GI01I. Comprehensive Warranty valid until 14-Apr-2027. 10-Year anti-rust inner tub warranty.",
        structured_metadata_json={
            "vendor": "Croma Aundh Pune",
            "invoice_no": "CRM-PNQ-2025-9912",
            "extraction_confidence": 0.98,
        },
        embedding_model="text-embedding-004",
        is_indexed_for_rag=True,
        document_date=date(2025, 4, 15),
        expiry_date=date(2027, 4, 14),
        created_by_id=sanika.id,
    )
    doc_car_insurance = Document(
        id=uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02"),
        household_id=household.id,
        asset_id=asset_car.id,
        title="ICICI Lombard Zero-Dep Motor Policy MH-12-VITAL-4590",
        document_type=DocumentType.INSURANCE_POLICY,
        gcs_uri="gs://homeiq-household-documents-dev/tare-sharma-pune/honda-city-icici-policy.pdf",
        mime_type="application/pdf",
        file_size_bytes=712400,
        sha256_checksum="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        extracted_text="ICICI Lombard Comprehensive Motor Policy #3001/29481022/00/000. IDV Rs. 18,40,000. Zero Depreciation + Engine Protect.",
        structured_metadata_json={
            "policy_number": "3001/29481022/00/000",
            "idv_inr": 1840000,
            "extraction_confidence": 0.99,
        },
        embedding_model="text-embedding-004",
        is_indexed_for_rag=True,
        document_date=date(2025, 11, 10),
        expiry_date=date(2026, 11, 9),
        created_by_id=rohan.id,
    )
    doc_parent_lab_report = Document(
        id=uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03"),
        household_id=household.id,
        asset_id=None,
        title="Golwilkar Metropolis Senior Health Panel & HbA1c Lab Report (Parents)",
        document_type=DocumentType.MEDICAL_LAB_REPORT,
        gcs_uri="gs://homeiq-household-documents-dev/tare-sharma-pune/parents-metropolis-lab-report-sep2026.pdf",
        mime_type="application/pdf",
        file_size_bytes=394200,
        sha256_checksum="4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
        extracted_text=(
            "Golwilkar Metropolis Diagnostics Kothrud Pune. Senior Comprehensive Panel (18-Sep-2026). "
            "Smt. Sunita Tare (Mother): HbA1c 6.1%, Fasting Glucose 102 mg/dL, Vitamin D 34 ng/mL, BP 124/78 mmHg. "
            "Shri. Prakash Tare (Father): Lipid Profile Total Cholesterol 172 mg/dL, BP 128/82 mmHg. "
            "Next periodic checkup due 05-Oct-2026 with Dr. A. Deshmukh at Deenanath Mangeshkar Hospital."
        ),
        structured_metadata_json={
            "lab_name": "Golwilkar Metropolis Diagnostics, Kothrud",
            "report_date": "2026-09-18",
            "extraction_confidence": 0.99,
        },
        embedding_model="text-embedding-004",
        is_indexed_for_rag=True,
        document_date=date(2026, 9, 18),
        expiry_date=date(2026, 12, 18),
        created_by_id=sanika.id,
    )
    session.add_all([doc_dishwasher_warranty, doc_car_insurance, doc_parent_lab_report])
    await session.flush()

    # 11. Warranties (associated with asset_dishwasher and doc_dishwasher_warranty)
    warranty_dishwasher = Warranty(
        id=uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01"),
        household_id=household.id,
        asset_id=asset_dishwasher.id,
        document_id=doc_dishwasher_warranty.id,
        warranty_type=WarrantyType.MANUFACTURER_STANDARD,
        provider_name="BSH Household Appliances Manufacturing Pvt Ltd",
        contract_or_policy_number="BSH-WR-2025-88412",
        start_date=date(2025, 4, 15),
        end_date=date(2027, 4, 14),
        coverage_limit_minor=5490000,
        covers_parts=True,
        covers_labor=True,
        support_contact_phone="1800-266-1880",
        support_contact_email="service.in@bosch-home.com",
        status=WarrantyStatus.ACTIVE,
        terms_summary="Covers all electrical, pump, and PCB defects; excludes plastic racks and descaling consumables.",
        created_by_id=sanika.id,
    )
    session.add(warranty_dishwasher)
    await session.flush()

    # 12. Insurance Policies (associated with asset_car and doc_car_insurance)
    policy_car = InsurancePolicy(
        household_id=household.id,
        asset_id=asset_car.id,
        document_id=doc_car_insurance.id,
        insurance_type=InsuranceType.MOTOR_COMPREHENSIVE,
        insurer_name="ICICI Lombard General Insurance",
        policy_number="3001/29481022/00/000",
        start_date=date(2025, 11, 10),
        end_date=date(2026, 11, 9),
        sum_insured_minor=184000000,  # ₹18,40,000.00 IDV
        premium_amount_minor=3420000,  # ₹34,200.00
        deductible_minor=100000,  # ₹1,000.00 compulsory deductible
        billing_cycle=BillingCycle.ANNUAL,
        is_active=True,
        tpa_or_claim_helpline="1800-2666",
        created_by_id=rohan.id,
    )
    session.add(policy_car)

    # 13. Maintenance Records (associated with asset_dishwasher & warranty_dishwasher)
    maint_dishwasher = MaintenanceRecord(
        id=uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccc01"),
        household_id=household.id,
        asset_id=asset_dishwasher.id,
        warranty_id=warranty_dishwasher.id,
        invoice_document_id=doc_dishwasher_warranty.id,
        maintenance_type=MaintenanceType.PREVENTIVE_SERVICE,
        status=MaintenanceStatus.COMPLETED,
        title="Biannual Descaling, Spray Arm Cleaning & Salt Calibration",
        description="Replaced micro-filter mesh and calibrated water hardness setting to H:04 for Pune municipal supply.",
        service_date=date(2026, 4, 10),
        completed_at=datetime(2026, 4, 10, 11, 30, tzinfo=timezone.utc),
        technician_or_vendor="Bosch Authorized Service Center, Wakdewadi",
        labor_cost_minor=0,  # Covered under warranty
        parts_cost_minor=85000,  # ₹850.00 descaler + salt kit
        covered_under_warranty=True,
        next_recommended_service_date=date(2026, 10, 10),
        created_by_id=sanika.id,
    )
    session.add(maint_dishwasher)
    await session.flush()

    # 14. Bills
    bill_electricity = Bill(
        id=uuid.UUID("dddddddd-dddd-4ddd-8ddd-dddddddddd01"),
        household_id=household.id,
        category=BillCategory.ELECTRICITY,
        provider_name="MSEDCL Mahavitaran (Pune Urban)",
        consumer_account_number="170019283746",
        invoice_number="MSEDCL-2026-09-8821",
        billing_period_start=date(2026, 8, 25),
        billing_period_end=date(2026, 9, 24),
        due_date=date(2026, 10, 8),
        amount_due_minor=418000,  # ₹4,180.00
        units_consumed=Decimal("362.500"),
        unit_measure="kWh",
        status=BillStatus.PENDING_PAYMENT,
        autopay_enabled=False,
        created_by_id=sanika.id,
    )
    session.add(bill_electricity)

    # 15. Subscriptions
    sub_broadband = Subscription(
        id=uuid.UUID("eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01"),
        household_id=household.id,
        name="Airtel Xstream Fiber 300 Mbps Plan",
        provider_name="Bharti Airtel Ltd",
        billing_cycle=BillingCycle.MONTHLY,
        recurring_amount_minor=176882,  # ₹1,768.82 incl GST
        currency_code="INR",
        start_date=date(2025, 1, 1),
        next_renewal_date=date(2026, 10, 5),
        status=SubscriptionStatus.ACTIVE,
        auto_renew=True,
        payment_method=PaymentMethod.CREDIT_CARD,
        created_by_id=rohan.id,
    )
    session.add(sub_broadband)
    await session.flush()

    # 16. Expenses (associated with asset_dishwasher and maint_dishwasher)
    expense_dishwasher_care = Expense(
        household_id=household.id,
        asset_id=asset_dishwasher.id,
        maintenance_record_id=maint_dishwasher.id,
        receipt_document_id=doc_dishwasher_warranty.id,
        paid_by_user_id=sanika.id,
        category=ExpenseCategory.HOME_MAINTENANCE,
        amount_minor=85000,  # ₹850.00
        currency_code="INR",
        merchant_name="Bosch Authorized Service Center, Wakdewadi",
        description="Finish Regeneration Salt + Bosch Descaler Kit during preventive service",
        incurred_on=date(2026, 4, 10),
        payment_method=PaymentMethod.UPI,
        reference_transaction_id="UPI-610049281723",
        is_reconciled=True,
        created_by_id=sanika.id,
    )
    session.add(expense_dishwasher_care)

    # 17. Reminders
    reminder_service = Reminder(
        id=uuid.UUID("ffffffff-ffff-4fff-8fff-ffffffffff01"),
        household_id=household.id,
        assigned_user_id=sanika.id,
        asset_id=asset_dishwasher.id,
        warranty_id=warranty_dishwasher.id,
        title="Schedule Bosch Dishwasher Biannual Preventive Service",
        description="Book free warranty-covered inspection before October 10, 2026.",
        domain="home_maintenance",
        priority=ReminderPriority.HIGH,
        status=ReminderStatus.PENDING,
        due_at=datetime(2026, 10, 10, 9, 0, tzinfo=timezone.utc),
        created_by_id=sanika.id,
    )
    reminder_parent_checkup = Reminder(
        id=uuid.UUID("ffffffff-ffff-4fff-8fff-ffffffffff02"),
        household_id=household.id,
        assigned_user_id=sanika.id,
        title="Parents' Monthly Senior Checkup & Cardiology Follow-up Visit",
        description="Accompany Smt. Sunita Tare (Mother) & Shri. Prakash Tare (Father) to Deenanath Mangeshkar Hospital on Oct 5, 2026 at 09:30 AM with Golwilkar Metropolis lab folder.",
        domain="parents_health",
        priority=ReminderPriority.HIGH,
        status=ReminderStatus.PENDING,
        due_at=datetime(2026, 10, 5, 9, 30, tzinfo=timezone.utc),
        created_by_id=sanika.id,
    )
    session.add_all([reminder_service, reminder_parent_checkup])
    await session.flush()

    # 17B. Parents' Health Monitoring Records
    health_checkup_mother = ParentHealthRecord(
        id=uuid.UUID("66666666-6666-4666-8666-666666666601"),
        household_id=household.id,
        document_id=doc_parent_lab_report.id,
        parent_name="Smt. Sunita Tare (Mother)",
        record_category=ParentHealthRecordCategory.PERIODIC_CHECKUP,
        title="Monthly Comprehensive Senior Checkup",
        provider_or_doctor="Dr. A. Deshmukh · Deenanath Mangeshkar Hospital",
        recorded_date=date(2026, 9, 5),
        next_due_or_followup_date=date(2026, 10, 5),
        schedule_or_frequency="Monthly (1st Monday)",
        explicit_measurement_value="BP: 124/78 mmHg · Pulse: 72 bpm · Weight: 63.8 kg",
        status=ParentHealthRecordStatus.DUE_SOON,
        notes="Carry previous ECG & Golwilkar Metropolis HbA1c folder.",
        created_by_id=sanika.id,
    )
    health_visit_father = ParentHealthRecord(
        id=uuid.UUID("66666666-6666-4666-8666-666666666602"),
        household_id=household.id,
        document_id=doc_parent_lab_report.id,
        parent_name="Shri. Prakash Tare (Father)",
        record_category=ParentHealthRecordCategory.DOCTOR_APPOINTMENT,
        title="Cardiology & Ophthalmology Routine Follow-up Visit",
        provider_or_doctor="Dr. S. Kulkarni · Sahyadri Super Speciality Hospital",
        recorded_date=date(2026, 9, 12),
        next_due_or_followup_date=date(2026, 10, 14),
        schedule_or_frequency="Quarterly Follow-up",
        explicit_measurement_value="Resting ECG: Recorded Normal Sinus · IOP: 14 mmHg",
        status=ParentHealthRecordStatus.SCHEDULED,
        notes="Routine 3-month consultation visit booked for 10:30 AM.",
        created_by_id=sanika.id,
    )
    health_lab_mother = ParentHealthRecord(
        id=uuid.UUID("66666666-6666-4666-8666-666666666603"),
        household_id=household.id,
        document_id=doc_parent_lab_report.id,
        parent_name="Smt. Sunita Tare (Mother)",
        record_category=ParentHealthRecordCategory.LAB_TEST_REPORT,
        title="HbA1c, Fasting Lipid Profile & Vitamin D Lab Panel",
        provider_or_doctor="Golwilkar Metropolis Diagnostics, Kothrud",
        recorded_date=date(2026, 9, 18),
        next_due_or_followup_date=date(2026, 12, 18),
        schedule_or_frequency="Every 3 Months",
        explicit_measurement_value="HbA1c: 6.1% · Fasting Glucose: 102 mg/dL · Vitamin D: 34 ng/mL",
        status=ParentHealthRecordStatus.RECORDED,
        notes="10-hour overnight fasting sample collected at home.",
        created_by_id=sanika.id,
    )
    health_meds_parents = ParentHealthRecord(
        id=uuid.UUID("66666666-6666-4666-8666-666666666604"),
        household_id=household.id,
        document_id=None,
        parent_name="Smt. Sunita Tare (Mother) & Shri. Prakash Tare (Father)",
        record_category=ParentHealthRecordCategory.MEDICATION_SCHEDULE,
        title="Daily Morning & Evening Prescribed Medication Schedule",
        provider_or_doctor="Dr. A. Deshmukh · Deenanath Mangeshkar Hospital",
        recorded_date=date(2026, 9, 1),
        next_due_or_followup_date=date(2026, 10, 15),
        schedule_or_frequency="Daily — 08:00 AM & 08:30 PM",
        explicit_measurement_value="Morning 08:00 AM (Post-Breakfast) · Evening 08:30 PM (Post-Dinner) — Refill due Oct 15",
        status=ParentHealthRecordStatus.ACTIVE,
        notes="Weekly pill organizer refilled every Sunday evening.",
        created_by_id=sanika.id,
    )
    health_vaccination_parents = ParentHealthRecord(
        id=uuid.UUID("66666666-6666-4666-8666-666666666605"),
        household_id=household.id,
        document_id=None,
        parent_name="Smt. Sunita Tare (Mother) & Shri. Prakash Tare (Father)",
        record_category=ParentHealthRecordCategory.VACCINATION_SCREENING,
        title="Annual Quadrivalent Influenza Vaccine & Bone Density DEXA Screening",
        provider_or_doctor="Deenanath Mangeshkar Preventive Care Clinic",
        recorded_date=date(2026, 8, 20),
        next_due_or_followup_date=date(2027, 8, 20),
        schedule_or_frequency="Annual Screening & Immunization",
        explicit_measurement_value="2026-27 Influenza Dose Administered · DEXA Screening Logged",
        status=ParentHealthRecordStatus.COMPLETED,
        notes="Batch certificates archived in household folder.",
        created_by_id=sanika.id,
    )
    health_measurement_father = ParentHealthRecord(
        id=uuid.UUID("66666666-6666-4666-8666-666666666606"),
        household_id=household.id,
        document_id=None,
        parent_name="Shri. Prakash Tare (Father)",
        record_category=ParentHealthRecordCategory.HEALTH_MEASUREMENT,
        title="Explicitly Recorded Home Blood Pressure, SpO2 & Fasting Glucose",
        provider_or_doctor="Home Omron HEM-7156T & Accu-Chek Guide Log",
        recorded_date=date(2026, 9, 27),
        next_due_or_followup_date=date(2026, 10, 4),
        schedule_or_frequency="Weekly Sunday Morning Log",
        explicit_measurement_value="BP: 128/82 mmHg · SpO2: 98% · Fasting Glucose: 98 mg/dL",
        status=ParentHealthRecordStatus.RECORDED,
        notes="Recorded at 07:30 AM after 10 minutes rest.",
        created_by_id=rohan.id,
    )
    session.add_all(
        [
            health_checkup_mother,
            health_visit_father,
            health_lab_mother,
            health_meds_parents,
            health_vaccination_parents,
            health_measurement_father,
        ]
    )
    await session.flush()

    # 17b. Travel & Leisure Planning Records (Domain 7)
    travel_udaipur = TravelRecord(
        household_id=household.id,
        trip_name="Diwali Family Heritage Retreat — Udaipur",
        destination="Udaipur, Rajasthan (UDR)",
        origin_city="Pune (PNQ)",
        record_category=TravelRecordCategory.FAMILY_VACATION,
        transport_mode=TravelTransportMode.FLIGHT,
        booking_reference="PNR-6E-KQ92M",
        provider_or_carrier="IndiGo Airlines / Taj Lake Palace",
        accommodation_name="Taj Lake Palace, Pichola",
        departure_date=date(2026, 11, 8),
        return_date=date(2026, 11, 13),
        travelers="Sanika, Rohan, Ramesh & Sunita (4 Adults)",
        status=TravelRecordStatus.BOOKED,
        expense_amount_minor=14850000,
        document_status="E-Tickets + Hotel Voucher Verified · Senior Wheelchair Assist Confirmed",
        important_date_label="Web Check-in Opens 2026-11-06 06:00 IST",
        notes="Pre-booked airport wheelchair assistance for parents.",
        created_by_id=sanika.id,
    )
    session.add(travel_udaipur)
    await session.flush()

    # 18. Agent Runs
    agent_run = AgentRun(
        id=uuid.UUID("99999999-9999-4999-8999-999999999901"),
        household_id=household.id,
        initiated_by_user_id=sanika.id,
        thread_id="thread-pune-2026-0928-01",
        target_domain="documents_warranty",
        user_prompt="Is our Bosch dishwasher spray arm covered under warranty and when is the next service due?",
        final_response=(
            "Yes. Under Contract #BSH-WR-2025-88412 (valid through April 14, 2027), "
            "all pump, electrical, and spray arm defects are covered. Your next preventive "
            "service is scheduled for October 10, 2026."
        ),
        status=AgentRunStatus.COMPLETED,
        highest_risk_level=ActionRiskLevel.READ_ONLY,
        requires_human_approval=False,
        tool_calls_json=[
            {"tool": "get_asset_warranty_coverage", "asset_tag": "AST-KIT-DW01", "status": "success"}
        ],
        grounded_citations_json=[
            {"document_id": str(doc_dishwasher_warranty.id), "title": doc_dishwasher_warranty.title}
        ],
        model_name="gemini-2.5-pro",
        prompt_tokens=640,
        completion_tokens=118,
        latency_ms=890,
        created_by_id=sanika.id,
    )
    session.add(agent_run)
    await session.flush()

    # 19. Events
    event_seeded = Event(
        id=uuid.UUID("88888888-8888-4888-8888-888888888801"),
        household_id=household.id,
        actor_user_id=sanika.id,
        asset_id=asset_dishwasher.id,
        agent_run_id=agent_run.id,
        event_type="asset.maintenance.verified",
        domain="home_maintenance",
        severity=EventSeverity.INFO,
        summary="Verified Bosch Series 6 Dishwasher warranty and preventive service schedule.",
        payload_json={"asset_tag": "AST-KIT-DW01", "next_service_due": "2026-10-10"},
        created_by_id=sanika.id,
    )
    session.add(event_seeded)
    await session.flush()

    # 20. Notifications
    notification = Notification(
        household_id=household.id,
        recipient_user_id=sanika.id,
        reminder_id=reminder_service.id,
        agent_run_id=agent_run.id,
        event_id=event_seeded.id,
        channel=NotificationChannel.IN_APP,
        status=NotificationStatus.UNREAD,
        title="Upcoming MSEDCL Electricity Bill & Dishwasher Service",
        body="MSEDCL bill of ₹4,180.00 is due Oct 8, and Bosch Dishwasher service is due Oct 10.",
        action_url="/domains/finance-expenses",
        created_by_id=sanika.id,
    )
    session.add(notification)
    await session.flush()

    return {
        "user_sanika_id": sanika.id,
        "user_rohan_id": rohan.id,
        "household_id": household.id,
        "asset_dishwasher_id": asset_dishwasher.id,
        "asset_car_id": asset_car.id,
        "warranty_dishwasher_id": warranty_dishwasher.id,
        "document_warranty_id": doc_dishwasher_warranty.id,
    }
