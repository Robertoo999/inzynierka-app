package com.prolearn.grading;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Engine;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

@Service
public class JsAutoGrader {

    public static class GradeResult {
        public final int passed, failed, score;
        public final String stdout;
        public final List<String> errors;

        public GradeResult(int passed, int failed, String stdout, List<String> errors, int score) {
            this.passed = passed;
            this.failed = failed;
            this.stdout = stdout;
            this.errors = errors;
            this.score = score;
        }
    }

    public GradeResult grade(String userCode, String testsScript, int maxPoints) {
        // Safety: guard against excessively large scripts
        final int MAX_CODE_LENGTH = 20000;
        final int MAX_TESTS_LENGTH = 20000;
        if (userCode != null && userCode.length() > MAX_CODE_LENGTH) {
            List<String> errors = new ArrayList<>();
            errors.add("User code too large");
            return new GradeResult(0,1,"",errors,0);
        }
        if (testsScript != null && testsScript.length() > MAX_TESTS_LENGTH) {
            List<String> errors = new ArrayList<>();
            errors.add("Tests script too large");
            return new GradeResult(0,1,"",errors,0);
        }
        Engine engine = Engine.newBuilder().build();

        // Zbieranie stdout z JS
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        Context.Builder builder = Context.newBuilder("js")
                .engine(engine)
                .allowAllAccess(false)              // bezpieczniej
                .option("js.ecmascript-version", "2022")
                .out(baos);                         // przechwycenie console.log/print

        String tests = (testsScript == null) ? "" : testsScript;

        // console.log -> print (print trafia do .out -> baos)
        String prelude = """
            var console = { 
              log: function(){ 
                var s = Array.prototype.map.call(arguments, function(x){ return String(x); }).join(' ');
                print(s);
              } 
            };
            var assert = { 
              equal: function(a,b){ if(a!==b) throw new Error('Expected '+a+' == '+b); } 
            };
            function __runTests(){ %TESTS% }
            """.replace("%TESTS%", tests);

        List<String> errors = new ArrayList<>();

        Context ctx = builder.build();
        try {
            ExecutorService ex = Executors.newSingleThreadExecutor();
            Future<?> fut = ex.submit(() -> {
                ctx.eval("js", userCode == null ? "" : userCode);
                ctx.eval("js", prelude);
                ctx.eval("js", "__runTests()");
                return null;
            });

            try {
                fut.get(2, TimeUnit.SECONDS); // timeout 2s
            } catch (TimeoutException te) {
                fut.cancel(true);
                errors.add("Time limit exceeded");
            } catch (ExecutionException ee) {
                Throwable cause = ee.getCause();
                errors.add("Runtime: " + (cause == null ? ee.toString() : cause.toString()));
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                errors.add("Interrupted");
            } finally {
                try { fut.cancel(true); } catch (Exception ignore) {}
                ex.shutdownNow();
                try { ex.awaitTermination(1, TimeUnit.SECONDS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            }
        } finally {
            try { ctx.close(true); } catch (Exception ignore) {}
        }

        int failed = errors.isEmpty() ? 0 : 1;
        int passed = errors.isEmpty() ? 1 : 0;
        int score  = failed == 0 ? maxPoints : Math.max(0, maxPoints - failed);

        String stdout = baos.toString(StandardCharsets.UTF_8);
        return new GradeResult(passed, failed, stdout, errors, score);
    }

    // New: grade with explicit per-test cases (input/expected/points)
    public GradeResult gradeWithCases(String userCode, java.util.List<com.prolearn.task.ProgrammingTestCase> cases) {
        // generate JS test script that outputs JSON array of results
        StringBuilder sb = new StringBuilder();
        sb.append("var __results = [];\n");
        for (var c : cases) {
            String in = c.getInput() == null ? "" : c.getInput().replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n");
            String expected = c.getExpected() == null ? "" : c.getExpected().replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n");

            // Both branches call solve(input) when available; we then compare the stringified result to expected.
            // EVAL: treat input as a single string argument to solve().
            // IO: same for JS grader; in non-JS languages IO is handled elsewhere.
            String runner = "try {\n" +
                    "  var input = \"" + in + "\";\n" +
                    "  var __res = null;\n" +
                    "  try { if (typeof solve === 'function') { __res = solve(input); } else if (typeof main === 'function') { __res = main(input); } } catch(e) { throw e }\n" +
                    "  var __actualStr = (__res !== null && typeof __res !== 'undefined') ? String(__res) : '';\n" +
                    "  var __ok = (String(__actualStr).trim() === \"" + expected + "\".trim());\n" +
                    "  __results.push({passed: __ok, actual: __actualStr, expected: \"" + expected + "\", points: (__ok ? " + c.getPoints() + " : 0)});\n" +
                    "} catch(e) { __results.push({passed:false, error: String(e), points:0}); }\n";
            sb.append(runner);
        }
        sb.append("print(JSON.stringify(__results));\n");

        String testsScript = sb.toString();

        // reuse existing grade logic but run generated testsScript and parse stdout
        Engine engine = Engine.newBuilder().build();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        Context.Builder builder = Context.newBuilder("js")
                .engine(engine)
                .allowAllAccess(false)
                .option("js.ecmascript-version", "2022")
                .out(baos);

        List<String> errors = new ArrayList<>();
        String stdout = "";
        Context ctx2 = builder.build();
        try {
            ExecutorService ex = Executors.newSingleThreadExecutor();
            Future<?> fut = ex.submit(() -> {
                ctx2.eval("js", userCode == null ? "" : userCode);
                ctx2.eval("js", "var console = { log: function(){ var s = Array.prototype.map.call(arguments, function(x){ return String(x); }).join(' '); print(s); } };\n");
                ctx2.eval("js", "function __runTests(){ %TESTS% }".replace("%TESTS%", testsScript));
                ctx2.eval("js", "__runTests()");
                return null;
            });

            try {
                fut.get(2, TimeUnit.SECONDS);
            } catch (TimeoutException te) {
                fut.cancel(true);
                errors.add("Time limit exceeded");
            } catch (ExecutionException ee) {
                Throwable cause = ee.getCause();
                errors.add("Runtime: " + (cause == null ? ee.toString() : cause.toString()));
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                errors.add("Interrupted");
            } finally {
                try { fut.cancel(true); } catch (Exception ignore) {}
                ex.shutdownNow();
                try { ex.awaitTermination(1, TimeUnit.SECONDS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            }
            stdout = baos.toString(StandardCharsets.UTF_8);
        } finally {
            try { ctx2.close(true); } catch (Exception ignore) {}
        }

        // try to parse stdout as JSON array of results
        int passed = 0;
        int failed = 0;
        int score = 0;
        try {
            String out = stdout.trim();
            if (!out.isEmpty()) {
                // find last JSON array in output
                int i = out.lastIndexOf('[');
                if (i >= 0) {
                    String json = out.substring(i);
                    com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                    var arr = om.readTree(json);
                    if (arr.isArray()) {
                        for (var node : arr) {
                            boolean ok = node.path("passed").asBoolean(false);
                            int pts = node.path("points").asInt(0);
                            if (ok) { passed++; score += pts; } else { failed++; }
                        }
                    }
                }
            }
        } catch (Exception e) {
            errors.add("Failed to parse grader output: " + e.toString());
        }

        return new GradeResult(passed, failed, stdout, errors, score);
    }
}
