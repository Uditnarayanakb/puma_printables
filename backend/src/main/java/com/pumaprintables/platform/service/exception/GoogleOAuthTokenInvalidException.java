package com.pumaprintables.platform.service.exception;

public class GoogleOAuthTokenInvalidException extends RuntimeException {

    public GoogleOAuthTokenInvalidException(String message) {
        super(message);
    }

    public GoogleOAuthTokenInvalidException(String message, Throwable cause) {
        super(message, cause);
    }
}
