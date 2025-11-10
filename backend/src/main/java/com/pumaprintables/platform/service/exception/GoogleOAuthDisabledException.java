package com.pumaprintables.platform.service.exception;

public class GoogleOAuthDisabledException extends RuntimeException {

    public GoogleOAuthDisabledException() {
        super("Google sign-in is not configured");
    }
}
