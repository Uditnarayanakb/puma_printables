package com.pumaprintables.platform.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.repository.UserRepository;

@Service
public class UserOnboardingService {

    private static final Logger log = LoggerFactory.getLogger(UserOnboardingService.class);

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final UserRepository userRepository;

    public UserOnboardingService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public byte[] exportSince(OffsetDateTime since) {
        List<User> users = userRepository.findByFirstLoginAtGreaterThanEqual(since);

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("New Users");
            createHeaderRow(sheet);
            populateRows(sheet, users);
            autosizeColumns(sheet, 8);

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            log.error("Unable to export onboarding report", ex);
            throw new IllegalStateException("Failed to export onboarding report", ex);
        }
    }

    private void createHeaderRow(Sheet sheet) {
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("Username");
        header.createCell(1).setCellValue("Full Name");
        header.createCell(2).setCellValue("Email");
        header.createCell(3).setCellValue("Role");
        header.createCell(4).setCellValue("Auth Provider");
        header.createCell(5).setCellValue("First Login At");
        header.createCell(6).setCellValue("Last Login At");
        header.createCell(7).setCellValue("Login Count");
    }

    private void populateRows(Sheet sheet, List<User> users) {
        List<User> sortedUsers = users.stream()
            .sorted(Comparator.comparing(User::getFirstLoginAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .collect(Collectors.toList());
        int rowIndex = 1;
        for (User user : sortedUsers) {
            Row row = sheet.createRow(rowIndex++);
            createTextCell(row, 0, user.getUsername());
            createTextCell(row, 1, user.getFullName());
            createTextCell(row, 2, user.getEmail());
            createTextCell(row, 3, user.getRole() != null ? user.getRole().name() : null);
            createTextCell(row, 4, user.getAuthProvider() != null ? user.getAuthProvider().name() : null);
            createTextCell(row, 5, formatTimestamp(user.getFirstLoginAt()));
            createTextCell(row, 6, formatTimestamp(user.getLastLoginAt()));
            createNumericCell(row, 7, user.getLoginCount());
        }
    }

    private void autosizeColumns(Sheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void createTextCell(Row row, int columnIndex, String value) {
        Cell cell = row.createCell(columnIndex);
        if (value == null) {
            cell.setBlank();
        } else {
            cell.setCellValue(value);
        }
    }

    private void createNumericCell(Row row, int columnIndex, Integer value) {
        Cell cell = row.createCell(columnIndex);
        if (value == null) {
            cell.setBlank();
        } else {
            cell.setCellValue(value);
        }
    }

    private String formatTimestamp(OffsetDateTime timestamp) {
        return timestamp == null ? null : TIMESTAMP_FORMATTER.format(timestamp);
    }
}
