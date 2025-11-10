package com.pumaprintables.platform.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.pumaprintables.platform.domain.model.User;
import com.pumaprintables.platform.domain.model.enums.AuthProvider;
import com.pumaprintables.platform.domain.model.enums.UserRole;
import com.pumaprintables.platform.domain.repository.UserRepository;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class UserOnboardingServiceTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserOnboardingService userOnboardingService;

    @BeforeEach
    void cleanData() {
        userRepository.deleteAll();
    }

    @Test
    void exportSince_includesUsersWithRecentFirstLogin() throws IOException {
        OffsetDateTime now = OffsetDateTime.now();
        User olderUser = User.builder()
            .username("legacy-user")
            .password("dummy")
            .email("legacy@example.com")
            .role(UserRole.STORE_USER)
            .authProvider(AuthProvider.LOCAL)
            .firstLoginAt(now.minusDays(45))
            .lastLoginAt(now.minusDays(10))
            .loginCount(5)
            .build();

        User recentUser = User.builder()
            .username("new-user")
            .password("dummy")
            .email("new@example.com")
            .role(UserRole.APPROVER)
            .authProvider(AuthProvider.GOOGLE)
            .providerSubject("google-subject")
            .fullName("New User")
            .firstLoginAt(now.minusDays(3))
            .lastLoginAt(now.minusDays(1))
            .loginCount(2)
            .build();

        userRepository.saveAll(List.of(olderUser, recentUser));

        byte[] report = userOnboardingService.exportSince(now.minusDays(7));

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(report))) {
            var sheet = workbook.getSheetAt(0);
            assertThat(sheet.getPhysicalNumberOfRows()).isEqualTo(2); // header + one data row
            var dataRow = sheet.getRow(1);
            assertThat(dataRow.getCell(0).getStringCellValue()).isEqualTo("new-user");
            assertThat(dataRow.getCell(2).getStringCellValue()).isEqualTo("new@example.com");
            assertThat(dataRow.getCell(4).getStringCellValue()).isEqualTo(AuthProvider.GOOGLE.name());
            assertThat(dataRow.getCell(7).getNumericCellValue()).isEqualTo(2d);
        }
    }
}
