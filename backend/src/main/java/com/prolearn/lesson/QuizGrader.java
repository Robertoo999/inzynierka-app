package com.prolearn.lesson;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

public class QuizGrader {
    public static record GradeResult(int correct, int total, int points, double percent) {}

    public static GradeResult grade(String bodyJson, List<Integer> answers, ObjectMapper objectMapper) throws Exception {
        if (bodyJson == null || bodyJson.isBlank()) throw new IllegalArgumentException("Brak treści quizu");
        JsonNode root = objectMapper.readTree(bodyJson);
        JsonNode questions = root.get("questions");
        int maxPoints = root.has("maxPoints") && root.get("maxPoints").isInt() ? root.get("maxPoints").asInt() : 10;
        if (questions == null || !questions.isArray()) throw new IllegalArgumentException("Brak tablicy pytań w treści quizu");

        int total = questions.size();
        List<Integer> ans = answers == null ? java.util.Collections.emptyList() : answers;
        int correct = 0;
        for (int i = 0; i < total; i++) {
            JsonNode q = questions.get(i);
            JsonNode choices = q.get("choices");
            if (choices == null || !choices.isArray()) continue;
            int chosen = i < ans.size() && ans.get(i) != null ? ans.get(i) : -1;
            if (chosen >= 0 && chosen < choices.size()) {
                JsonNode choice = choices.get(chosen);
                if (choice.has("correct") && choice.get("correct").asBoolean(false)) correct++;
            }
        }
        double percent = total == 0 ? 0.0 : (100.0 * correct) / total;
        int points = (int) Math.round((double) maxPoints * ((double) correct / (double) Math.max(1, total)));
        return new GradeResult(correct, total, points, percent);
    }
}
