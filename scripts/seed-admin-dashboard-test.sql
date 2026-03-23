DO $$
DECLARE
    v_citizen_id INT;
    v_ent_owner_id INT;
    v_collector_user_id INT;
    v_enterprise_id INT;
    v_collector_id INT;
    v_report_id INT;
    v_date TIMESTAMP;
    v_status TEXT;
    v_role_citizen_id INT;
    v_role_enterprise_id INT;
    v_role_collector_id INT;
    i INT;
BEGIN
    -- 1. Lấy ID của các Role
    SELECT id INTO v_role_citizen_id FROM "Role" WHERE "name" = 'CITIZEN';
    SELECT id INTO v_role_enterprise_id FROM "Role" WHERE "name" = 'ENTERPRISE';
    SELECT id INTO v_role_collector_id FROM "Role" WHERE "name" = 'COLLECTOR';

    -- 2. Tạo User Citizen mẫu
    INSERT INTO "User" ("email", "password", "fullName", "roleId", "status", "createdAt", "updatedAt")
    VALUES ('test_citizen@wdp.com', '$2b$10$dummy', 'Citizen Test Admin', v_role_citizen_id, 'ACTIVE', NOW(), NOW())
    ON CONFLICT ("email") DO UPDATE SET "fullName" = EXCLUDED."fullName"
    RETURNING id INTO v_citizen_id;

    -- 3. Tạo User Enterprise Owner mẫu
    INSERT INTO "User" ("email", "password", "fullName", "roleId", "status", "createdAt", "updatedAt")
    VALUES ('test_enterprise@wdp.com', '$2b$10$dummy', 'Enterprise Owner Test', v_role_enterprise_id, 'ACTIVE', NOW(), NOW())
    ON CONFLICT ("email") DO UPDATE SET "fullName" = EXCLUDED."fullName"
    RETURNING id INTO v_ent_owner_id;

    -- 4. Tạo User Collector mẫu
    INSERT INTO "User" ("email", "password", "fullName", "roleId", "status", "createdAt", "updatedAt")
    VALUES ('test_collector@wdp.com', '$2b$10$dummy', 'Collector Test Admin', v_role_collector_id, 'ACTIVE', NOW(), NOW())
    ON CONFLICT ("email") DO UPDATE SET "fullName" = EXCLUDED."fullName"
    RETURNING id INTO v_collector_user_id;

    -- 5. Tạo Enterprise
    INSERT INTO "Enterprise" ("userId", "name", "status", "address", "latitude", "longitude", "capacityKg", "createdAt", "updatedAt")
    VALUES (v_ent_owner_id, 'Công ty Môi Trường Xanh Test', 'ACTIVE', '123 Đường Test, HCM', 10.7, 106.6, 5000, NOW(), NOW())
    ON CONFLICT ("userId") DO UPDATE SET "name" = EXCLUDED."name"
    RETURNING id INTO v_enterprise_id;

    -- 6. Tạo Collector
    INSERT INTO "Collector" ("userId", "enterpriseId", "employeeCode", "workingHours", "trustScore", "isActive", "createdAt", "updatedAt")
    VALUES (v_collector_user_id, v_enterprise_id, 'EMP-TEST-001', '{"monday": {"active": true, "end": "17:00", "start": "08:00"}}'::jsonb, 100, true, NOW(), NOW())
    ON CONFLICT ("userId") DO UPDATE SET "employeeCode" = EXCLUDED."employeeCode"
    RETURNING id INTO v_collector_id;

    -- 7. Đảm bảo SystemConfig & Plans
    INSERT INTO "SystemConfig" ("id", "citizenBasePoint", "organicMultiplier", "recyclableMultiplier", "hazardousMultiplier", "accuracyMatchMultiplier", "accuracyModerateMultiplier", "accuracyHeavyMultiplier", "collectorMatchTrustScore", "penaltyWeightMismatch", "penaltyUnauthorizedFee", "penaltyNoShow", "penaltyDefault", "citizenCompensation", "updatedAt")
    VALUES (1, 100, 1.0, 1.2, 1.5, 1.0, 0.7, 0.3, 2, 20, 30, 15, 10, 50, NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO "SubscriptionPlanConfig" ("name", "description", "price", "durationMonths", "isActive", "createdAt", "updatedAt")
    VALUES ('Gói Test Admin', 'Gói dùng để test', 1000000, 1, true, NOW(), NOW())
    ON CONFLICT (name) DO NOTHING;

    -- 8. Tạo 100 Report ngẫu nhiên
    FOR i IN 1..100 LOOP
        v_date := NOW() - (random() * interval '30 days');
        CASE floor(random() * 4)
            WHEN 0 THEN v_status := 'COMPLETED';
            WHEN 1 THEN v_status := 'FAILED';
            WHEN 2 THEN v_status := 'PENDING';
            ELSE v_status := 'CANCELLED';
        END CASE;

        INSERT INTO "Report" ("citizenId", "currentEnterpriseId", "address", "latitude", "longitude", "provinceCode", "districtCode", "wardCode", "description", "status", "createdAt", "updatedAt")
        VALUES (v_citizen_id, v_enterprise_id, 'Địa chỉ mẫu ' || i, 10.7 + (random()*0.1), 106.6 + (random()*0.1), '79', '760', '26740', 'Mô tả report ' || i, v_status::"ReportStatus", v_date, v_date)
        RETURNING id INTO v_report_id;

        IF v_status = 'COMPLETED' THEN
            -- Sửa lỗi: Đã thêm v_report_id vào danh sách VALUES
            INSERT INTO "ReportActualWaste" ("reportId", "wasteType", "weightKg", "createdAt")
            VALUES 
            (v_report_id, 'ORGANIC'::"WasteType", random() * 10 + 1, v_date),
            (v_report_id, 'RECYCLABLE'::"WasteType", random() * 5, v_date);
            
            INSERT INTO "PointTransaction" ("userId", "reportId", "type", "amount", "balanceAfter", "createdAt", "description")
            VALUES (v_citizen_id, v_report_id, 'EARN', 100, 1000 + (i*10), v_date, 'Thưởng report ' || i);
        END IF;
    END LOOP;

    -- 9. Tạo Payments thành công
    FOR i IN 1..20 LOOP
        v_date := NOW() - (random() * interval '30 days');
        INSERT INTO "Payment" ("userId", "enterpriseId", "subscriptionPlanConfigId", "method", "status", "amount", "currency", "description", "referenceCode", "createdAt", "paidAt", "updatedAt")
        VALUES (v_ent_owner_id, v_enterprise_id, (SELECT id FROM "SubscriptionPlanConfig" LIMIT 1), 'BANK_TRANSFER', 'PAID', 1000000, 'VND', 'Thanh toán test ' || i, 'REF-ADMIN-FINAL-' || i || '-' || floor(random()*999), v_date, v_date, v_date);
    END LOOP;

    -- 10. Tạo Dispatch Logs
    FOR i IN 1..50 LOOP
        INSERT INTO "DispatchLog" ("createdAt", "level", "message")
        VALUES (NOW() - (random() * interval '2 days'), (ARRAY['INFO', 'WARN', 'ERROR'])[floor(random()*3)+1], 'Hệ thống log mẫu ' || i);
    END LOOP;

    RAISE NOTICE 'Đã tạo bộ dữ liệu mẫu Test Admin hoàn chỉnh và an toàn!';
END $$;
