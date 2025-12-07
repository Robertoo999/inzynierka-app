package com.prolearn.lesson.dto;

import java.time.Instant;
import java.util.UUID;

public record LessonListItem(
	UUID id,
	String title,
	Instant createdAt,
	int blocksCount,
	int tasksCount,
	int quizzesCount,
	int maxPoints
) {}
