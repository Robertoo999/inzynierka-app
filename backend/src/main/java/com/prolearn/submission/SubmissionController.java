package com.prolearn.submission;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prolearn.classes.ClassService;
import com.prolearn.grading.CodeExecutionService;
import com.prolearn.grading.JsAutoGrader;
import com.prolearn.submission.dto.ClassSubmissionResponse;
import com.prolearn.submission.dto.GradeRequest;
import com.prolearn.submission.dto.SubmissionCreateRequest;
import com.prolearn.submission.dto.SubmissionResponse;
import com.prolearn.task.ProgrammingTestCase;
import com.prolearn.task.ProgrammingTestCaseRepository;
import com.prolearn.task.Task;
import com.prolearn.task.TaskRepository;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping(produces = MediaType.APPLICATION_JSON_VALUE)
public class SubmissionController {

    private static final EnumSet<SubmissionStatus> ATTEMPT_STATUSES = EnumSet.of(SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED);

    private final SubmissionRepository submissions;
    private final TaskRepository tasks;
    private final UserRepository users;
    private final JsAutoGrader jsAutoGrader;
    private final ProgrammingTestCaseRepository testRepo;
    private final ObjectMapper objectMapper;
    private final ClassService classService;
    private final CodeExecutionService codeExecutionService;

    public SubmissionController(SubmissionRepository submissions,
                                TaskRepository tasks,
                                UserRepository users,
                                JsAutoGrader jsAutoGrader,
                                ProgrammingTestCaseRepository testRepo,
                                ObjectMapper objectMapper,
                                ClassService classService,
                                CodeExecutionService codeExecutionService) {
        this.submissions = submissions;
        this.tasks = tasks;
        this.users = users;
        this.jsAutoGrader = jsAutoGrader;
        this.testRepo = testRepo;
        this.objectMapper = objectMapper;
        this.classService = classService;
        this.codeExecutionService = codeExecutionService;
    }

    // ---------- Creation & Submission ----------

    @RolesAllowed({"STUDENT","ROLE_STUDENT"})
    @PostMapping(value = "/api/tasks/{taskId}/submissions", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public SubmissionResponse create(@PathVariable("taskId") UUID taskId,
                                     @Valid @RequestBody SubmissionCreateRequest req,
                                     Authentication auth) {
        UUID studentId = (UUID) auth.getDetails();
        Task task = tasks.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));

        if (!("CODE".equalsIgnoreCase(task.getType()) || "TASK".equalsIgnoreCase(task.getType()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zadanie nie jest zadaniem kodu");
        }

        long priorAttempts = submissions.countByTaskIdAndStudent_IdAndStatusIn(taskId, studentId, ATTEMPT_STATUSES);
        Integer maxAttempts = task.getMaxAttempts();
        if (maxAttempts != null && maxAttempts > 0 && priorAttempts >= maxAttempts) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit prób został osiągnięty");
        }

        Submission s = new Submission();
        s.setTask(task);
        s.setStudent(users.findById(studentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nie znaleziono studenta")));
        s.setContent(req.content());
        s.setCreatedAt(Instant.now());
        s.setStatus(SubmissionStatus.SUBMITTED);
        s.setCode(req.code());
        s.setAttemptNumber((int) (priorAttempts + 1));

        // Auto-grade now (JavaScript / Python)
        gradeAuto(task, s);

        s = submissions.save(s);
        return map(s);
    }

    // Alias used by tests expecting method name 'submit'
    @RolesAllowed({"STUDENT","ROLE_STUDENT"})
    @PostMapping(value = "/api/tasks/{taskId}/submit", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public SubmissionResponse submit(@PathVariable("taskId") UUID taskId,
                                     @Valid @RequestBody SubmissionCreateRequest req,
                                     Authentication auth) {
        return create(taskId, req, auth);
    }

    private void gradeAuto(Task task, Submission s) {
        String lang = task.getLanguage();
        var casesList = testRepo.findByTaskIdOrderByOrderAsc(task.getId());
        boolean isJs = lang != null && (lang.equalsIgnoreCase("javascript") || lang.equalsIgnoreCase("js") || lang.equalsIgnoreCase("node"));
        boolean isPy = lang != null && lang.toLowerCase().startsWith("py");
        Map<String,Object> report = new HashMap<>();

        if (isJs) {
            if (casesList != null && !casesList.isEmpty()) {
                boolean hasIO = casesList.stream().anyMatch(c -> "IO".equalsIgnoreCase(c.getMode()));
                boolean hasEval = casesList.stream().anyMatch(c -> !"IO".equalsIgnoreCase(c.getMode()));
                List<Map<String,Object>> results = new ArrayList<>();
                if (hasEval) {
                    var evalCases = casesList.stream().filter(c -> !"IO".equalsIgnoreCase(c.getMode())).toList();
                    var evalRes = jsAutoGrader.gradeWithCases(s.getCode(), evalCases);
                    try {
                        String out = evalRes.stdout == null ? "" : evalRes.stdout.trim();
                        if (!out.isEmpty()) {
                            int i = out.lastIndexOf('[');
                            if (i >= 0) {
                                var list = objectMapper.readValue(out.substring(i), List.class);
                                for (int k=0;k<evalCases.size();k++) {
                                    Map<String,Object> m = (Map<String,Object>) list.get(k);
                                    ProgrammingTestCase c = evalCases.get(k);
                                    m.put("id", c.getId());
                                    m.putIfAbsent("expected", c.getExpected());
                                    m.putIfAbsent("input", c.getInput());
                                    results.add(m);
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
                if (hasIO && codeExecutionService.isAvailable()) {
                    int nodeLangId = 63;
                    for (ProgrammingTestCase c : casesList) {
                        if (!"IO".equalsIgnoreCase(c.getMode())) continue;
                        try {
                            var exec = codeExecutionService.execute(nodeLangId, s.getCode(), c.getInput());
                            String actual = exec.stdout == null ? "" : exec.stdout.trim();
                            boolean ok = (exec.stderr == null || exec.stderr.isBlank()) && actual.equals(c.getExpected() == null ? "" : c.getExpected().trim());
                            Map<String,Object> tr = new HashMap<>();
                            tr.put("id", c.getId());
                            tr.put("input", c.getInput());
                            tr.put("expected", c.getExpected());
                            tr.put("actual", actual);
                            tr.put("passed", ok);
                            tr.put("points", ok ? c.getPoints() : 0);
                            if (exec.stderr != null && !exec.stderr.isBlank()) tr.put("error", exec.stderr);
                            results.add(tr);
                        } catch (Exception e) {
                            Map<String,Object> tr = new HashMap<>();
                            tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", e.getMessage());
                            results.add(tr);
                        }
                    }
                }
                // sort
                Map<UUID,Integer> order = new HashMap<>();
                for (int i=0;i<casesList.size();i++) order.put(casesList.get(i).getId(), i);
                results.sort((a,b)-> Integer.compare(order.getOrDefault((UUID)a.get("id"),0), order.getOrDefault((UUID)b.get("id"),0)));
                long passed = results.stream().filter(r -> Boolean.TRUE.equals(r.get("passed"))).count();
                int score = results.stream().mapToInt(r -> ((Number) r.getOrDefault("points",0)).intValue()).sum();
                report.put("tests", results);
                report.put("passed", passed);
                report.put("failed", results.size() - passed);
                report.put("maxPoints", task.getMaxPoints());
                s.setStdout(null);
                s.setAutoScore(score);
                s.setPoints(score);
            } else {
                var res = jsAutoGrader.grade(s.getCode(), task.getTests(), task.getMaxPoints());
                report.put("passed", res.passed);
                report.put("failed", res.failed);
                report.put("errors", res.errors);
                report.put("maxPoints", task.getMaxPoints());
                s.setStdout(res.stdout);
                s.setAutoScore(res.score);
                s.setPoints(res.score);
            }
        } else if (isPy) {
            if (casesList == null || casesList.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Brak skonfigurowanych testów dla tego zadania");
            List<Map<String,Object>> testResults = new ArrayList<>();
            if (codeExecutionService.isAvailable()) {
                int langId = 71; // Python3
                String userCode = s.getCode();
                boolean hasSolve = userCode != null && userCode.toLowerCase().contains("def solve");
                String harness = hasSolve ? "\nif (__name__ == '__main__'):\n    import sys\n    data = sys.stdin.read().strip()\n    try:\n        print(str(solve(data)))\n    except Exception as e:\n        print('__ERROR__'+str(e))\n" : "";
                for (ProgrammingTestCase c : casesList) {
                    try {
                        var exec = codeExecutionService.execute(langId, userCode + harness, c.getInput());
                        String actual = exec.stdout == null ? "" : exec.stdout.trim();
                        String stderr = exec.stderr == null ? "" : exec.stderr.trim();
                        boolean hadError = (stderr != null && !stderr.isBlank()) || actual.startsWith("__ERROR__");
                        if (actual.startsWith("__ERROR__")) actual = actual.substring("__ERROR__".length());
                        boolean ok = !hadError && actual.trim().equals(c.getExpected() == null ? "" : c.getExpected().trim());
                        Map<String,Object> tr = new HashMap<>();
                        tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", actual); tr.put("passed", ok); tr.put("points", ok ? c.getPoints() : 0);
                        if (hadError) tr.put("error", (stderr != null && !stderr.isBlank()) ? stderr : (actual.isEmpty() ? "Błąd wykonania" : actual));
                        testResults.add(tr);
                    } catch (Exception e) {
                        Map<String,Object> tr = new HashMap<>();
                        tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", e.getMessage());
                        testResults.add(tr);
                    }
                }
            } else {
                for (ProgrammingTestCase c : casesList) {
                    Map<String,Object> tr = new HashMap<>();
                    tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", "Wykonywanie Pythona niedostępne (skonfiguruj JUDGE0_URL)");
                    testResults.add(tr);
                }
            }
            int score = testResults.stream().mapToInt(m -> ((Number) m.getOrDefault("points",0)).intValue()).sum();
            long passed = testResults.stream().filter(m -> Boolean.TRUE.equals(m.get("passed"))).count();
            long failed = testResults.size() - passed;
            report.put("tests", testResults);
            report.put("passed", passed);
            report.put("failed", failed);
            report.put("maxPoints", task.getMaxPoints());
            s.setStdout(null);
            s.setAutoScore(score);
            s.setPoints(score);
        } else {
            // unsupported language -> leave ungraded
            report.put("error", "Nieobsługiwany język: " + lang);
        }
        try { s.setTestReport(objectMapper.writeValueAsString(report)); } catch (Exception e) { s.setTestReport("{\"error\":\"Błąd serializacji raportu\"}"); }
        s.setStatus(SubmissionStatus.GRADED);
        s.setGradedAt(Instant.now());
    }

    // ---------- Run (no persistence) ----------

    public static record RunRequest(String code, String language) { public RunRequest(String code) { this(code, null); } }

    @RolesAllowed({"STUDENT","ROLE_STUDENT","TEACHER","ROLE_TEACHER"})
    @PostMapping(value = "/api/tasks/{taskId}/run", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public Map<String,Object> runCode(@PathVariable("taskId") UUID taskId, @RequestBody RunRequest req, Authentication auth) {
        Task task = tasks.findById(taskId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));
        if (!("CODE".equalsIgnoreCase(task.getType()) || "TASK".equalsIgnoreCase(task.getType()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zadanie nie jest zadaniem kodu");
        }
        var casesList = testRepo.findByTaskIdOrderByOrderAsc(taskId);
        String effectiveLang = (req.language() != null && !req.language().isBlank()) ? req.language() : task.getLanguage();
        String codeToRun = req.code() == null ? "" : req.code();

        if (effectiveLang != null && (effectiveLang.equalsIgnoreCase("javascript") || effectiveLang.equalsIgnoreCase("js") || effectiveLang.equalsIgnoreCase("node"))) {
            Map<String,Object> out = new HashMap<>();
            if (casesList != null && !casesList.isEmpty()) {
                boolean hasIO = casesList.stream().anyMatch(c -> "IO".equalsIgnoreCase(c.getMode()));
                boolean hasEval = casesList.stream().anyMatch(c -> !"IO".equalsIgnoreCase(c.getMode()));
                if (hasIO && codeExecutionService.isAvailable()) {
                    int nodeLangId = 63;
                    List<Map<String,Object>> results = new ArrayList<>();
                    if (hasEval) {
                        var evalCases = casesList.stream().filter(c -> !"IO".equalsIgnoreCase(c.getMode())).toList();
                        var evalRes = jsAutoGrader.gradeWithCases(codeToRun, evalCases);
                        try {
                            String s = evalRes.stdout == null ? "" : evalRes.stdout.trim();
                            if (!s.isEmpty()) {
                                int i = s.lastIndexOf('[');
                                if (i >= 0) {
                                    var list = objectMapper.readValue(s.substring(i), List.class);
                                    for (int k=0;k<evalCases.size();k++) {
                                        Map<String,Object> m = (Map<String,Object>) list.get(k);
                                        ProgrammingTestCase c = evalCases.get(k);
                                        m.put("id", c.getId());
                                        m.putIfAbsent("expected", c.getExpected());
                                        m.putIfAbsent("input", c.getInput());
                                        results.add(m);
                                    }
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                    for (ProgrammingTestCase c : casesList) {
                        if (!"IO".equalsIgnoreCase(c.getMode())) continue;
                        try {
                            var exec = codeExecutionService.execute(nodeLangId, codeToRun, c.getInput());
                            String actual = exec.stdout == null ? "" : exec.stdout.trim();
                            boolean ok = (exec.stderr == null || exec.stderr.isBlank()) && actual.equals(c.getExpected() == null ? "" : c.getExpected().trim());
                            Map<String,Object> tr = new HashMap<>();
                            tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", actual); tr.put("passed", ok); tr.put("points", ok ? c.getPoints() : 0);
                            if (exec.stderr != null && !exec.stderr.isBlank()) tr.put("error", exec.stderr);
                            results.add(tr);
                        } catch (Exception e) {
                            Map<String,Object> tr = new HashMap<>();
                            tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", e.getMessage());
                            results.add(tr);
                        }
                    }
                    Map<UUID,Integer> order = new HashMap<>();
                    for (int i=0;i<casesList.size();i++) order.put(casesList.get(i).getId(), i);
                    results.sort((a,b)-> Integer.compare(order.getOrDefault((UUID)a.get("id"),0), order.getOrDefault((UUID)b.get("id"),0)));
                    long passed = results.stream().filter(m -> Boolean.TRUE.equals(m.get("passed"))).count();
                    int score = results.stream().mapToInt(m -> ((Number)m.getOrDefault("points",0)).intValue()).sum();
                    out.put("tests", results); out.put("passed", passed); out.put("failed", results.size()-passed); out.put("score", score);
                    return out;
                } else {
                    var res = jsAutoGrader.gradeWithCases(codeToRun, casesList);
                    out.put("passed", res.passed); out.put("failed", res.failed); out.put("score", res.score); out.put("stdout", res.stdout); out.put("errors", res.errors);
                    try {
                        String s = res.stdout == null ? "" : res.stdout.trim();
                        if (!s.isEmpty()) {
                            int i = s.lastIndexOf('[');
                            if (i>=0) {
                                out.put("tests", objectMapper.readValue(s.substring(i), List.class));
                            }
                        }
                    } catch (Exception ignored) {}
                    return out;
                }
            } else {
                var res = jsAutoGrader.grade(codeToRun, task.getTests(), task.getMaxPoints());
                out.put("passed", res.passed); out.put("failed", res.failed); out.put("score", res.score); out.put("stdout", res.stdout); out.put("errors", res.errors);
                return out;
            }
        } else if (effectiveLang != null && (effectiveLang.equalsIgnoreCase("python") || effectiveLang.toLowerCase().startsWith("py"))) {
            if (casesList == null || casesList.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Brak skonfigurowanych testów dla tego zadania");
            List<Map<String,Object>> testResults = new ArrayList<>();
            if (codeExecutionService.isAvailable()) {
                int langId = 71;
                String userCode = codeToRun;
                boolean hasSolve = userCode != null && userCode.toLowerCase().contains("def solve");
                String harness = hasSolve ? "\nif (__name__ == '__main__'):\n    import sys\n    data = sys.stdin.read().strip()\n    try:\n        print(str(solve(data)))\n    except Exception as e:\n        print('__ERROR__'+str(e))\n" : "";
                for (ProgrammingTestCase c : casesList) {
                    try {
                        var exec = codeExecutionService.execute(langId, userCode + harness, c.getInput());
                        String actual = exec.stdout == null ? "" : exec.stdout.trim();
                        String stderr = exec.stderr == null ? "" : exec.stderr.trim();
                        boolean hadError = (stderr != null && !stderr.isBlank()) || actual.startsWith("__ERROR__");
                        if (actual.startsWith("__ERROR__")) actual = actual.substring("__ERROR__".length());
                        boolean ok = !hadError && actual.trim().equals(c.getExpected() == null ? "" : c.getExpected().trim());
                        Map<String,Object> tr = new HashMap<>();
                        tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", actual); tr.put("passed", ok); tr.put("points", ok ? c.getPoints() : 0);
                        if (hadError) tr.put("error", (stderr != null && !stderr.isBlank()) ? stderr : (actual.isEmpty() ? "Błąd wykonania" : actual));
                        testResults.add(tr);
                    } catch (Exception e) {
                        Map<String,Object> tr = new HashMap<>();
                        tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", e.getMessage());
                        testResults.add(tr);
                    }
                }
            } else {
                for (ProgrammingTestCase c : casesList) {
                    Map<String,Object> tr = new HashMap<>();
                    tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", "Wykonywanie Pythona niedostępne (skonfiguruj JUDGE0_URL)");
                    testResults.add(tr);
                }
            }
            Map<String,Object> out = new HashMap<>();
            out.put("tests", testResults);
            out.put("passed", testResults.stream().filter(t -> Boolean.TRUE.equals(t.get("passed"))).count());
            out.put("failed", testResults.stream().filter(t -> !Boolean.TRUE.equals(t.get("passed"))).count());
            out.put("score", testResults.stream().mapToInt(t -> ((Number)t.get("points")).intValue()).sum());
            return out;
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uruchamianie nieobsługiwane dla języka: " + effectiveLang);
        }
    }

    // ---------- Demo Run (teacher solution) ----------

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PostMapping(value = "/api/tasks/{taskId}/run-demo")
    @Transactional(readOnly = true)
    public Map<String,Object> runDemo(@PathVariable("taskId") UUID taskId) {
        Task task = tasks.findById(taskId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));
        String teacherCode = task.getTeacherSolution();
        if (teacherCode == null || teacherCode.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Brak rozwiązania wzorcowego (teacherSolution) dla zadania");
        }
        var casesList = testRepo.findByTaskIdOrderByOrderAsc(taskId);
        String effectiveLang = task.getLanguage();
        if (!("CODE".equalsIgnoreCase(task.getType()) || "TASK".equalsIgnoreCase(task.getType()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task is not a code task");
        }

        Map<String,Object> result;
        if (effectiveLang != null && (effectiveLang.equalsIgnoreCase("javascript") || effectiveLang.equalsIgnoreCase("js") || effectiveLang.equalsIgnoreCase("node"))) {
            // Reuse runCode logic with teacherCode
            result = runCodeInternal(teacherCode, effectiveLang, task, casesList, true);
        } else if (effectiveLang != null && (effectiveLang.equalsIgnoreCase("python") || effectiveLang.toLowerCase().startsWith("py"))) {
            result = runCodeInternal(teacherCode, effectiveLang, task, casesList, true);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uruchamianie nieobsługiwane dla języka: " + effectiveLang);
        }

        // Sanitize hidden tests: null input/expected/actual
        Object testsObj = result.get("tests");
        if (testsObj instanceof List<?> list && casesList != null && !casesList.isEmpty()) {
            // If pure EVAL path was used, test maps may lack IDs. Attach them by order when sizes match.
            boolean anyId = list.stream().anyMatch(o -> (o instanceof Map<?,?> mm) && mm.containsKey("id"));
            if (!anyId && list.size() == casesList.size()) {
                for (int i=0;i<list.size();i++) {
                    Object o = list.get(i);
                    if (o instanceof Map<?,?> m) {
                        ProgrammingTestCase c = casesList.get(i);
                        ((Map<String,Object>)m).put("id", c.getId());
                    }
                }
            }
            Map<UUID,ProgrammingTestCase> byId = new HashMap<>();
            for (ProgrammingTestCase c : casesList) byId.put(c.getId(), c);
            for (Object o : list) {
                if (!(o instanceof Map<?,?> m)) continue;
                Object idVal = m.get("id");
                UUID uid = null;
                if (idVal instanceof UUID u) uid = u; else if (idVal instanceof String s) { try { uid = UUID.fromString(s); } catch (Exception ignored) {} }
                if (uid == null) continue;
                ProgrammingTestCase tc = byId.get(uid);
                if (tc != null && !tc.isVisible()) {
                    // Remove sensitive fields entirely for hidden tests (teacher demo)
                    ((Map<String,Object>)m).remove("input");
                    ((Map<String,Object>)m).remove("expected");
                    ((Map<String,Object>)m).remove("actual");
                }
            }
        }
        // Also sanitize stdout JSON (if present) to avoid leaking hidden test expected/actual values
        if (casesList != null && !casesList.isEmpty()) {
            Object rawStdout = result.get("stdout");
            if (rawStdout instanceof String s && !s.isBlank()) {
                try {
                    String trimmed = s.trim();
                    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                        java.util.List<java.util.Map<String,Object>> arr = objectMapper.readValue(trimmed, java.util.List.class);
                        if (arr.size() == casesList.size()) {
                            for (int i=0;i<arr.size();i++) {
                                ProgrammingTestCase tc = casesList.get(i);
                                if (tc != null && !tc.isVisible()) {
                                    java.util.Map<String,Object> mm = arr.get(i);
                                    mm.remove("expected");
                                    mm.remove("actual");
                                    mm.remove("input");
                                }
                            }
                            result.put("stdout", objectMapper.writeValueAsString(arr));
                        }
                    }
                } catch (Exception ignored) {}
            }
        }
        return result;
    }

    // Internal runner used by demo
    private Map<String,Object> runCodeInternal(String code, String lang, Task task, List<ProgrammingTestCase> casesList, boolean includeIo) {
        if (lang != null && (lang.equalsIgnoreCase("javascript") || lang.equalsIgnoreCase("js") || lang.equalsIgnoreCase("node"))) {
            Map<String,Object> out = new HashMap<>();
            if (casesList != null && !casesList.isEmpty()) {
                boolean hasIO = includeIo && casesList.stream().anyMatch(c -> "IO".equalsIgnoreCase(c.getMode()));
                boolean hasEval = casesList.stream().anyMatch(c -> !"IO".equalsIgnoreCase(c.getMode()));
                if (hasIO && codeExecutionService.isAvailable()) {
                    int nodeLangId = 63;
                    List<Map<String,Object>> results = new ArrayList<>();
                    if (hasEval) {
                        var evalCases = casesList.stream().filter(c -> !"IO".equalsIgnoreCase(c.getMode())).toList();
                        var evalRes = jsAutoGrader.gradeWithCases(code, evalCases);
                        try {
                            String evalOut = evalRes.stdout == null ? "" : evalRes.stdout.trim();
                            if (!evalOut.isEmpty()) {
                                int i = evalOut.lastIndexOf('[');
                                if (i >= 0) {
                                    var list = objectMapper.readValue(evalOut.substring(i), List.class);
                                    for (int k=0;k<evalCases.size();k++) {
                                        Map<String,Object> m = (Map<String,Object>) list.get(k);
                                        ProgrammingTestCase c = evalCases.get(k);
                                        m.put("id", c.getId());
                                        m.putIfAbsent("expected", c.getExpected());
                                        m.putIfAbsent("input", c.getInput());
                                        results.add(m);
                                    }
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                    for (ProgrammingTestCase c : casesList) {
                        if (!"IO".equalsIgnoreCase(c.getMode())) continue;
                        try {
                            var exec = codeExecutionService.execute(nodeLangId, code, c.getInput());
                            String actual = exec.stdout == null ? "" : exec.stdout.trim();
                            boolean ok = (exec.stderr == null || exec.stderr.isBlank()) && actual.equals(c.getExpected() == null ? "" : c.getExpected().trim());
                            Map<String,Object> tr = new HashMap<>();
                            tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", actual); tr.put("passed", ok); tr.put("points", ok ? c.getPoints() : 0);
                            if (exec.stderr != null && !exec.stderr.isBlank()) tr.put("error", exec.stderr);
                            results.add(tr);
                        } catch (Exception e) {
                            Map<String,Object> tr = new HashMap<>();
                            tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", e.getMessage());
                            results.add(tr);
                        }
                    }
                    Map<UUID,Integer> order = new HashMap<>();
                    for (int i=0;i<casesList.size();i++) order.put(casesList.get(i).getId(), i);
                    results.sort((a,b)-> Integer.compare(order.getOrDefault((UUID)a.get("id"),0), order.getOrDefault((UUID)b.get("id"),0)));
                    long passed = results.stream().filter(m -> Boolean.TRUE.equals(m.get("passed"))).count();
                    int score = results.stream().mapToInt(m -> ((Number)m.getOrDefault("points",0)).intValue()).sum();
                    out.put("tests", results); out.put("passed", passed); out.put("failed", results.size()-passed); out.put("score", score);
                    return out;
                } else {
                    var res = jsAutoGrader.gradeWithCases(code, casesList);
                    out.put("passed", res.passed); out.put("failed", res.failed); out.put("score", res.score); out.put("stdout", res.stdout); out.put("errors", res.errors);
                    try {
                        String gradedOut = res.stdout == null ? "" : res.stdout.trim();
                        if (!gradedOut.isEmpty()) {
                            int i = gradedOut.lastIndexOf('[');
                            if (i>=0) out.put("tests", objectMapper.readValue(gradedOut.substring(i), List.class));
                        }
                    } catch (Exception ignored) {}
                    return out;
                }
            } else {
                var res = jsAutoGrader.grade(code, task.getTests(), task.getMaxPoints());
                out.put("passed", res.passed); out.put("failed", res.failed); out.put("score", res.score); out.put("stdout", res.stdout); out.put("errors", res.errors);
                return out;
            }
        } else if (lang != null && (lang.equalsIgnoreCase("python") || lang.toLowerCase().startsWith("py"))) {
            if (casesList == null || casesList.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Brak skonfigurowanych testów dla tego zadania");
            List<Map<String,Object>> testResults = new ArrayList<>();
            if (codeExecutionService.isAvailable()) {
                int langId = 71;
                String userCode = code;
                boolean hasSolve = userCode != null && userCode.toLowerCase().contains("def solve");
                String harness = hasSolve ? "\nif (__name__ == '__main__'):\n    import sys\n    data = sys.stdin.read().strip()\n    try:\n        print(str(solve(data)))\n    except Exception as e:\n        print('__ERROR__'+str(e))\n" : "";
                for (ProgrammingTestCase c : casesList) {
                    try {
                        var exec = codeExecutionService.execute(langId, userCode + harness, c.getInput());
                        String actual = exec.stdout == null ? "" : exec.stdout.trim();
                        String stderr = exec.stderr == null ? "" : exec.stderr.trim();
                        boolean hadError = (stderr != null && !stderr.isBlank()) || actual.startsWith("__ERROR__");
                        if (actual.startsWith("__ERROR__")) actual = actual.substring("__ERROR__".length());
                        boolean ok = !hadError && actual.trim().equals(c.getExpected() == null ? "" : c.getExpected().trim());
                        Map<String,Object> tr = new HashMap<>();
                        tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", actual); tr.put("passed", ok); tr.put("points", ok ? c.getPoints() : 0);
                        if (hadError) tr.put("error", (stderr != null && !stderr.isBlank()) ? stderr : (actual.isEmpty() ? "Błąd wykonania" : actual));
                        testResults.add(tr);
                    } catch (Exception e) {
                        Map<String,Object> tr = new HashMap<>();
                        tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", e.getMessage());
                        testResults.add(tr);
                    }
                }
            } else {
                for (ProgrammingTestCase c : casesList) {
                    Map<String,Object> tr = new HashMap<>();
                    tr.put("id", c.getId()); tr.put("input", c.getInput()); tr.put("expected", c.getExpected()); tr.put("actual", ""); tr.put("passed", false); tr.put("points", 0); tr.put("error", "Wykonywanie Pythona niedostępne (skonfiguruj JUDGE0_URL)");
                    testResults.add(tr);
                }
            }
            Map<String,Object> out = new HashMap<>();
            out.put("tests", testResults);
            out.put("passed", testResults.stream().filter(t -> Boolean.TRUE.equals(t.get("passed"))).count());
            out.put("failed", testResults.stream().filter(t -> !Boolean.TRUE.equals(t.get("passed"))).count());
            out.put("score", testResults.stream().mapToInt(t -> ((Number)t.get("points")).intValue()).sum());
            return out;
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uruchamianie nieobsługiwane dla języka: " + lang);
        }
    }

    // ---------- Querying Submissions ----------

    @RolesAllowed({"STUDENT","ROLE_STUDENT"})
    @GetMapping("/api/my/submissions")
    @Transactional(readOnly = true)
    public List<SubmissionResponse> mySubmissions(Authentication auth) {
        UUID studentId = (UUID) auth.getDetails();
        return submissions.findByStudentIdOrderByCreatedAtDesc(studentId).stream().map(this::map).toList();
    }

    @RolesAllowed({"STUDENT","ROLE_STUDENT"})
    @GetMapping("/api/tasks/{taskId}/submissions/me")
    @Transactional(readOnly = true)
    public SubmissionResponse mySubmissionForTask(@PathVariable("taskId") UUID taskId, Authentication auth) {
        UUID studentId = (UUID) auth.getDetails();
        Submission s = submissions.findTopByTaskIdAndStudent_IdOrderByCreatedAtDesc(taskId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zgłoszenia"));
        return map(s);
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @GetMapping("/api/tasks/{taskId}/submissions")
    @Transactional(readOnly = true)
    public List<SubmissionResponse> listForTask(@PathVariable("taskId") UUID taskId) {
        return submissions.findByTaskIdOrderByCreatedAtDesc(taskId).stream().map(this::map).toList();
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @GetMapping("/api/classes/{classId}/submissions")
    @Transactional(readOnly = true)
    public List<ClassSubmissionResponse> listClassSubmissions(@PathVariable("classId") Long classId, Authentication auth) {
        UUID teacherId = auth == null ? null : (UUID) auth.getDetails();
        if (teacherId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        classService.requireTeacherMembership(classId, teacherId);
        List<Submission> list = submissions.findByTask_Lesson_Classroom_IdOrderByCreatedAtDesc(classId);
        return list.stream().map(s -> {
            Task task = s.getTask();
            var lesson = task == null ? null : task.getLesson();
            var student = s.getStudent();
            return new ClassSubmissionResponse(
                    map(s),
                    lesson == null ? null : lesson.getId(),
                    lesson == null ? null : lesson.getTitle(),
                    task == null ? null : task.getTitle(),
                    student == null ? null : student.getEmail(),
                    student == null ? null : student.getFirstName(),
                    student == null ? null : student.getLastName()
            );
        }).toList();
    }

    @GetMapping("/api/submissions/{id}")
    @Transactional(readOnly = true)
    public SubmissionResponse getOne(@PathVariable("id") UUID id, Authentication auth) {
        var s = submissions.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zgłoszenia"));
        var authorities = auth == null ? List.<String>of() : auth.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        boolean isTeacher = authorities.contains("TEACHER") || authorities.contains("ROLE_TEACHER");
        UUID callerId = auth == null ? null : (UUID) auth.getDetails();
        if (!isTeacher && (callerId == null || !callerId.equals(s.getStudent().getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Brak uprawnień");
        }
        return map(s);
    }

    // ---------- Manual Grading ----------

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PostMapping(value = "/api/submissions/{id}/grade", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public SubmissionResponse grade(@PathVariable("id") UUID id, @Valid @RequestBody GradeRequest req, Authentication auth) {
        Submission s = submissions.findByIdWithTask(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zgłoszenia"));
        int max = s.getTask().getMaxPoints();
        Integer manualScore = req.manualScore();
        if (manualScore != null && manualScore > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ręczna punktacja musi być w zakresie 0.." + max);
        UUID teacherId = (UUID) auth.getDetails();
        User teacher = users.findById(Objects.requireNonNull(teacherId, "teacherId")).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nie znaleziono nauczyciela"));
        s.setManualScore(manualScore);
        s.setTeacherComment(req.teacherComment());
        s.setFeedback(req.teacherComment());
        if (manualScore != null) s.setPoints(manualScore); else if (s.getAutoScore() != null) s.setPoints(s.getAutoScore());
        s.setStatus(SubmissionStatus.GRADED);
        s.setGradedAt(Instant.now());
        s.setGradedBy(teacher);
        s = submissions.save(s);
        return map(s);
    }

    // ---------- Mapping ----------

    private SubmissionResponse map(Submission s) {
        Task task = s.getTask();
        Integer manualScore = s.getManualScore();
        Integer autoScore = s.getAutoScore();
        Integer points = s.getPoints();
        Integer effectiveScore = manualScore != null ? manualScore : (points != null ? points : autoScore);
        return new SubmissionResponse(
                s.getId(),
                task.getId(),
                s.getStudent().getId(),
                s.getContent(),
                s.getStatus(),
                s.getPoints(),
                s.getFeedback(),
                s.getGradedAt(),
                s.getGradedBy() == null ? null : s.getGradedBy().getId(),
                s.getCreatedAt(),
                s.getCode(),
                autoScore,
                s.getStdout(),
                s.getTestReport(),
                s.getAttemptNumber(),
                manualScore,
                s.getTeacherComment(),
                task.getMaxAttempts(),
                task.getMaxPoints(),
                effectiveScore
        );
    }
}
