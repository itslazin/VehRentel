package com.thrissurvehirental.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class DatabaseDiagnostics {
    private static final Logger log = LoggerFactory.getLogger(DatabaseDiagnostics.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseDiagnostics(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logComplaintSchema() {
        try {
            Map<String, Object> identity = jdbcTemplate.queryForMap(
                "SELECT DATABASE() AS database_name, @@hostname AS database_host");
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT column_name, column_type, is_nullable, column_default " +
                "FROM information_schema.columns " +
                "WHERE table_schema = DATABASE() AND table_name = 'complaints' " +
                "AND column_name IN ('customer_id', 'shop_id') " +
                "ORDER BY ordinal_position");
            List<Map<String, Object>> foreignKeys = jdbcTemplate.queryForList(
                "SELECT constraint_name, column_name, referenced_table_name, referenced_column_name " +
                "FROM information_schema.key_column_usage " +
                "WHERE table_schema = DATABASE() AND table_name = 'complaints' " +
                "AND column_name IN ('customer_id', 'shop_id') " +
                "AND referenced_table_name IS NOT NULL");
            log.info("Complaint schema database={} host={} columns={} foreignKeys={}",
                identity.get("database_name"), identity.get("database_host"), columns, foreignKeys);
        } catch (RuntimeException exception) {
            log.error("Unable to inspect the active complaint database schema", exception);
        }
    }
}
