package com.prolearn.lesson;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;

public class QuizGraderTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    public void gradesCorrectly_singleQuestion() throws Exception {
        String body = "{\"maxPoints\":10,\"questions\":[{\"text\":\"Q1\",\"choices\":[{\"text\":\"A\",\"correct\":true},{\"text\":\"B\"}]}]}";
        var res = QuizGrader.grade(body, List.of(0), mapper);
        Assertions.assertEquals(1, res.correct());
        Assertions.assertEquals(1, res.total());
        Assertions.assertEquals(10, res.points());
    }

    @Test
    public void gradesPartial_multipleQuestions() throws Exception {
        String body = "{\"maxPoints\":20,\"questions\":[{\"text\":\"Q1\",\"choices\":[{\"text\":\"A\",\"correct\":true},{\"text\":\"B\"}]},{\"text\":\"Q2\",\"choices\":[{\"text\":\"A\"},{\"text\":\"B\",\"correct\":true}]}]}";
        var res = QuizGrader.grade(body, List.of(0, 0), mapper);
        Assertions.assertEquals(1, res.correct());
        Assertions.assertEquals(2, res.total());
        // points should be roughly half of maxPoints
        Assertions.assertTrue(res.points() == 10 || res.points() == 9 || res.points() == 11);
    }

    @Test
    public void handlesEmptyAnswers() throws Exception {
        String body = "{\"questions\":[]}";
        var res = QuizGrader.grade(body, null, mapper);
        Assertions.assertEquals(0, res.correct());
        Assertions.assertEquals(0, res.total());
    }
}
