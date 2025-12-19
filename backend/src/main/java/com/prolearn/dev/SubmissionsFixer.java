package com.prolearn.dev;

import com.prolearn.grading.JsAutoGrader;
import com.prolearn.submission.Submission;
import com.prolearn.submission.SubmissionRepository;
import com.prolearn.task.ProgrammingTestCaseRepository;
import com.prolearn.task.TaskRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(200)
public class SubmissionsFixer implements CommandLineRunner {

    private final SubmissionRepository submissionRepo;
    private final ProgrammingTestCaseRepository caseRepo;
    private final JsAutoGrader jsAutoGrader;

    public SubmissionsFixer(SubmissionRepository submissionRepo, ProgrammingTestCaseRepository caseRepo, JsAutoGrader jsAutoGrader) {
        this.submissionRepo = submissionRepo;
        this.caseRepo = caseRepo;
        this.jsAutoGrader = jsAutoGrader;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            var all = submissionRepo.findAll();
            for (Submission s : all) {
                try {
                    String code = s.getCode() == null ? "" : s.getCode();
                    String report = s.getTestReport() == null ? "" : s.getTestReport();
                    if ((code.contains("split(/s+") || code.contains("split(/s+/)")) || report.contains("NaN")) {
                        String fixed = code.replace("split(/s+)", "split(/\\s+/)").replace("split(/s+/)", "split(/\\s+/)");
                        if (!fixed.equals(code)) {
                            var cases = caseRepo.findByTaskIdOrderByOrderAsc(s.getTask().getId());
                            var grade = jsAutoGrader.gradeWithCases(fixed, cases);
                            s.setCode(fixed);
                            s.setAutoScore(grade.score);
                            s.setPoints(grade.score);
                            s.setTestReport(grade.stdout);
                            submissionRepo.save(s);
                            System.out.println("SubmissionsFixer: fixed submission " + s.getId() + " for task " + s.getTask().getTitle() + " -> score=" + grade.score);
                        }
                    }
                } catch (Exception ex) {
                    System.err.println("SubmissionsFixer: failed to process submission " + s.getId() + ": " + ex.getMessage());
                }
            }
        } catch (Exception ex) {
            System.err.println("SubmissionsFixer: failed: " + ex.getMessage());
        }
    }
}
