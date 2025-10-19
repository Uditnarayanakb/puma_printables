package com.pumaprintables.platform.web.controller;

import com.pumaprintables.platform.service.AuthService;
import com.pumaprintables.platform.web.dto.AuthResponse;
import com.pumaprintables.platform.web.dto.LoginRequest;
import com.pumaprintables.platform.web.dto.RegisterUserRequest;
import com.pumaprintables.platform.web.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        String token = authService.authenticate(request.username(), request.password());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterUserRequest request) {
        var user = authService.register(request.username(), request.password(), request.email(), request.role());
        var response = new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
