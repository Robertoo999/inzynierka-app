package com.prolearn.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private static Map<String, Object> base(HttpStatus status, String message) {
        Map<String, Object> m = new HashMap<>();
        m.put("timestamp", Instant.now().toString());
        m.put("status", status.value());
        m.put("error", status.getReasonPhrase());
        m.put("message", message);
        m.put("path", currentPath());
        return m;
    }

    private static String currentPath() {
        try {
            var req = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (req instanceof org.springframework.web.context.request.ServletRequestAttributes s) {
                return s.getRequest().getRequestURI();
            }
        } catch (Exception ignore) {}
        return null;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> onValidation(MethodArgumentNotValidException ex) {
        log.debug("Validation error", ex);
        Map<String, Object> body = base(HttpStatus.BAD_REQUEST, "Błąd walidacji");
        Map<String, String> fields = new HashMap<>();
        for (FieldError err : ex.getBindingResult().getFieldErrors()) {
            fields.put(err.getField(), err.getDefaultMessage() != null ? err.getDefaultMessage() : "Invalid value");
        }
        body.put("fields", fields);
        // Construct specific detail listing invalid fields
        if (!fields.isEmpty()) {
            String joined = String.join(", ", fields.keySet());
            body.put("detail", "Nieprawidłowe pola: " + joined);
        } else {
            body.put("detail", "Co najmniej jedno pole ma nieprawidłową wartość");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> onIntegrity(DataIntegrityViolationException ex) {
        log.warn("Integrity violation", ex);
        Map<String, Object> body = base(HttpStatus.CONFLICT, "Naruszenie integralności danych");
        body.put("detail", ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> onStatus(ResponseStatusException ex) {
        log.debug("RSE", ex);
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String reason = ex.getReason() != null ? ex.getReason() : "Błąd";
        Map<String, Object> body = base(status, reason);
        // add detail same as reason for clarity
        body.putIfAbsent("detail", reason);
        // simple code mapping for known messages
        String code = switch (reason) {
            case "Stare hasło nieprawidłowe" -> "OLD_PASSWORD_INVALID";
            case "Nowe hasło musi mieć co najmniej 6 znaków" -> "NEW_PASSWORD_TOO_SHORT";
            case "Nie jesteś członkiem tej klasy" -> "NOT_CLASS_MEMBER";
            case "Tę operację może wykonać tylko nauczyciel tej klasy" -> "NOT_CLASS_TEACHER";
            default -> null;
        };
        if (code != null) body.put("code", code);
        return ResponseEntity.status(ex.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> onAny(Exception ex) {
        log.error("Unhandled error", ex);
        Map<String, Object> body = base(HttpStatus.INTERNAL_SERVER_ERROR, "Nieoczekiwany błąd serwera");
        body.put("detail", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }
}
