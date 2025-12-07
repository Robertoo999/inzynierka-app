package com.prolearn.grading;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
public class CodeExecutionService {

    private final String judge0Url;
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public CodeExecutionService(
            @Value("${JUDGE0_URL:}") String envJudge0Url,
            @Value("${app.judge0-url:}") String propJudge0Url
    ) {
        String fromEnv = (envJudge0Url == null || envJudge0Url.isBlank()) ? System.getenv("JUDGE0_URL") : envJudge0Url;
        String candidate = (fromEnv != null && !fromEnv.isBlank()) ? fromEnv : propJudge0Url;
        if (candidate == null || candidate.isBlank()) {
            // Fallback for local dev so Python IO works without manual config
            candidate = "https://ce.judge0.com";
        }
        this.judge0Url = candidate;
    }

    public static class ExecResult {
        public String stdout = null;
        public String stderr = null;
        public String status = null;
        public int exitCode = -1;
        public String raw = null;
    }

    public boolean isAvailable() { return judge0Url != null && !judge0Url.isBlank(); }

    /**
     * Execute code using Judge0 (simple POC). languageId must be a numeric id known by Judge0 or 0 for default.
     */
    public ExecResult execute(int languageId, String source, String stdin) throws IOException, InterruptedException {
        if (!isAvailable()) throw new IllegalStateException("Judge0 not configured (JUDGE0_URL)");

        Map<String,Object> payload = new HashMap<>();
        payload.put("source_code", source == null ? "" : source);
        payload.put("language_id", languageId);
        payload.put("stdin", stdin == null ? "" : stdin);

        String body = om.writeValueAsString(payload);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(judge0Url + "/submissions?base64_encoded=false&wait=true"))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        String txt = resp.body();
        ExecResult out = new ExecResult();
        out.raw = txt;
        try {
            JsonNode node = om.readTree(txt);
            out.stdout = node.path("stdout").asText(null);
            out.stderr = node.path("stderr").asText(null);
            out.status = node.path("status").path("description").asText(null);
            out.exitCode = node.path("status").path("id").asInt(-1);
        } catch (Exception e) {
            // ignore parse errors
        }
        return out;
    }
}
