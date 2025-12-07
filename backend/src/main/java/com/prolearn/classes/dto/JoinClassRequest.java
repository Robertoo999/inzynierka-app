package com.prolearn.classes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinClassRequest(
	@NotBlank(message = "Kod klasy jest wymagany")
	@Size(min = 6, max = 6, message = "Kod klasy musi mieć dokładnie 6 znaków")
	String code
) {}
