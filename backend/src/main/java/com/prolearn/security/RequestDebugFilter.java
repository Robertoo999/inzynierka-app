package com.prolearn.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.stream.Collectors;

public class RequestDebugFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        String auths = (a == null || a.getAuthorities() == null)
                ? "[]"
                : a.getAuthorities().stream().map(Object::toString).collect(Collectors.joining(", ", "[", "]"));
        logger.info("REQ " + req.getMethod() + " " + req.getRequestURI() + " -> auth=" + auths);
        chain.doFilter(req, res);
    }
}
