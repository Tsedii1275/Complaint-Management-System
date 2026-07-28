package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.HolidayCalendar;
import com.example.flowable_demo.model.SlaConfig;
import com.example.flowable_demo.service.SlaConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sla/config")
public class SlaConfigController {

    @Autowired
    private SlaConfigService slaConfigService;

    @GetMapping
    public ResponseEntity<List<SlaConfig>> getAllSlaConfigs() {
        return ResponseEntity.ok(slaConfigService.getAllConfigs());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SlaConfig> updateSlaConfig(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        Integer allowedMinutes = payload.get("allowedMinutes") != null
                ? Integer.parseInt(payload.get("allowedMinutes").toString())
                : null;
        String displayName = (String) payload.get("displayName");
        String description = (String) payload.get("description");

        SlaConfig updated = slaConfigService.updateConfig(id, allowedMinutes, displayName, description);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetToDefaults() {
        slaConfigService.resetSlaConfigs();
        return ResponseEntity.ok(Map.of("message", "SLA configurations successfully reset to Dashen Bank defaults."));
    }

    @PostMapping("/purge")
    public ResponseEntity<Map<String, String>> purgeAllData() {
        slaConfigService.purgeAllSlaData();
        return ResponseEntity.ok(Map.of("message",
                "All SLA data, breach logs, and metrics successfully purged. System reset to fresh state."));
    }

    // ─── Holiday Calendar Endpoints ───

    @GetMapping("/holidays")
    public ResponseEntity<List<HolidayCalendar>> getAllHolidays() {
        return ResponseEntity.ok(slaConfigService.getAllHolidays());
    }

    @PostMapping("/holidays")
    public ResponseEntity<HolidayCalendar> addHoliday(@RequestBody Map<String, String> payload) {
        LocalDate date = LocalDate.parse(payload.get("holidayDate"));
        String name = payload.get("holidayName");
        String type = payload.get("holidayType");

        HolidayCalendar created = slaConfigService.addHoliday(date, name, type);
        return ResponseEntity.ok(created);
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<Map<String, String>> deleteHoliday(@PathVariable Long id) {
        slaConfigService.deleteHoliday(id);
        return ResponseEntity.ok(Map.of("message", "Holiday successfully removed."));
    }
}