package com.example.flowable_demo.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.nio.file.Files;
import java.nio.file.Paths;

@Component
public class SchemaInitializer implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("====================================================================");
        System.out.println("SchemaInitializer: Starting target database schema updates...");
        System.out.println("====================================================================");
        
        try {
            // Read DDL definitions from project cms_db.sql file
            String sqlContent = new String(Files.readAllBytes(Paths.get("cms_db.sql")));
            
            // Split by semicolon, clean, and run statement-by-statement
            String[] statements = sqlContent.split(";");
            int executedCount = 0;
            
            for (String sql : statements) {
                // Strip comments and leading/trailing whitespace
                String cleanSql = sql.replaceAll("(?m)^--.*$", "")
                                     .replaceAll("(?s)/\\*.*?\\*/", "")
                                     .trim();
                
                if (!cleanSql.isEmpty() && !cleanSql.toUpperCase().startsWith("START TRANSACTION") && !cleanSql.toUpperCase().startsWith("COMMIT")) {
                    try {
                        jdbcTemplate.execute(cleanSql);
                        executedCount++;
                    } catch (Exception e) {
                        // Log warnings without breaking startup
                        System.out.println("Note: Statement skipped/already exists (" + e.getMessage().substring(0, Math.min(e.getMessage().length(), 100)) + "...)");
                    }
                }
            }
            
            System.out.println("====================================================================");
            System.out.println("SchemaInitializer: Completed. Successfully executed " + executedCount + " statements.");
            System.out.println("====================================================================");
        } catch (Exception e) {
            System.err.println("SchemaInitializer Error: Failed to execute schema script: " + e.getMessage());
        }
    }
}
