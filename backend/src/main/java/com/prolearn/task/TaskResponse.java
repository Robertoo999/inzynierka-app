package com.prolearn.task;

import java.util.UUID;

public record TaskResponse(UUID id, String title, String description, int maxPoints) {}
