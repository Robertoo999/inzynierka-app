package com.prolearn.lesson;

import com.prolearn.classes.Classroom;
import com.prolearn.classes.ClassroomRepository;
import com.prolearn.classes.ClassMemberId;
import com.prolearn.classes.ClassMember;
import com.prolearn.lesson.dto.LessonCreateRequest;
import com.prolearn.lesson.dto.LessonDetailResponse;
import com.prolearn.lesson.dto.LessonListItem;
import com.prolearn.task.TaskRepository;
import com.prolearn.task.TaskResponse;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepo;
    private final LessonActivityRepository activityRepo;
    private final TaskRepository taskRepo;
    private final UserRepository userRepo;
    private final com.prolearn.submission.SubmissionRepository submissionRepo;
    private final com.prolearn.classes.ClassMemberRepository classMemberRepo;
    private final ClassroomRepository classroomRepo;
    private final com.prolearn.lesson.QuizAttemptRepository quizAttemptRepository;
    private final ObjectMapper objectMapper;
    // Removed dependency on ClassService to avoid circular refs; use repositories + local checks instead

    /**
     * Zwraca listę wszystkich lekcji (publiczne).
     */
    @Transactional(readOnly = true)
    public List<LessonListItem> getAllLessons() {
        return lessonRepo.findAll().stream()
                .sorted(Comparator.comparing(Lesson::getCreatedAt).reversed())
                .map(this::toListItem)
                .toList();
    }

    /**
     * Zwraca szczegóły lekcji.
     */
    @Transactional(readOnly = true)
    public LessonDetailResponse getLessonDetails(UUID lessonId) {
        Objects.requireNonNull(lessonId, "lessonId");
        Lesson lesson = lessonRepo.findById(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found"));

        var taskList = taskRepo.findAllByLesson_IdOrderByCreatedAtAsc(lessonId).stream()
                .map(t -> new TaskResponse(t.getId(), t.getTitle(), t.getDescription(), t.getMaxPoints()))
                .toList();

        var actList = activityRepo.findAllByLesson_IdOrderByOrderIndexAsc(lessonId).stream()
                .map(a -> new com.prolearn.lesson.dto.LessonActivityDto(
                        a.getId(), a.getType(), a.getTitle(), a.getOrderIndex(),
                        a.getBody(), a.getTask() != null ? a.getTask().getId() : null, a.getCreatedAt()
                )).toList();

        return new LessonDetailResponse(
                lesson.getId(), lesson.getTitle(), lesson.getContent(), lesson.getCreatedAt(), taskList, actList
        );
    }

    /**
     * Zwraca listę lekcji w klasie.
     */
    @Transactional(readOnly = true)
    public List<LessonListItem> getLessonsInClass(Long classId) {
        return lessonRepo.findAllByClassroom_IdOrderByCreatedAtAsc(classId).stream()
                .map(this::toListItem)
                .toList();
    }

    /**
     * Tworzy lekcję w klasie (wymaga bycia nauczycielem).
     */
    @Transactional
    public LessonListItem createLessonInClass(Long classId, LessonCreateRequest req, UUID userId) {
        Objects.requireNonNull(userId, "userId");
    requireTeacherMembership(classId, userId);

    Classroom classroom = classroomRepo.findById(classId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
        User author = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        Lesson lesson = new Lesson();
        lesson.setTitle(req.title());
        lesson.setContent(req.content() == null ? "" : req.content());
        lesson.setCreatedBy(author);
        lesson.setClassroom(classroom);

        lesson = lessonRepo.save(lesson);
        return toListItem(lesson);
    }

    /**
     * Aktualizuje lekcję (wymaga bycia nauczycielem).
     */
    @Transactional
    public LessonListItem updateLesson(Long classId, UUID lessonId, String title, String content, UUID userId) {
        Objects.requireNonNull(lessonId, "lessonId");
    requireTeacherMembership(classId, userId);

        Lesson lesson = lessonRepo.findById(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found"));

        if (lesson.getClassroom() == null || !lesson.getClassroom().getId().equals(classId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lesson not in this class");
        }

        if (title != null) lesson.setTitle(title);
        if (content != null) lesson.setContent(content);

        lesson = lessonRepo.save(lesson);
        return toListItem(lesson);
    }

    /**
     * Tworzy lekcję wraz z aktywnościami i (opcjonalnie) zadaniami w jednej transakcji.
     */
    @Transactional
    public LessonListItem createLessonWithActivities(Long classId,
                                                     com.prolearn.lesson.dto.LessonWithActivitiesCreateRequest req,
                                                     UUID userId) {
        Objects.requireNonNull(userId, "userId");
    requireTeacherMembership(classId, userId);

    Classroom classroom = classroomRepo.findById(classId)
        .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Class not found"));
        User author = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));

        Lesson lesson = new Lesson();
        lesson.setTitle(req.title());
        lesson.setContent(req.content() == null ? "" : req.content());
        lesson.setCreatedBy(author);
        lesson.setClassroom(classroom);
        lesson = lessonRepo.save(lesson);

        // persist activities and optional tasks
        if (req.activities() != null) {
            int idx = 0;
            for (var a : req.activities()) {
                com.prolearn.lesson.LessonActivity act = new com.prolearn.lesson.LessonActivity();
                act.setLesson(lesson);
                act.setType(a.type() == null ? "CONTENT" : a.type());
                act.setTitle(a.title());
                act.setBody(a.body());
                act.setOrderIndex(idx++);

                // if activity includes task, create task and attach
                var t = a.task();
                if (t != null) {
                    com.prolearn.task.Task task = new com.prolearn.task.Task();
                    task.setLesson(lesson);
                    task.setTitle(t.title());
                    task.setDescription(t.description());
                    task.setMaxPoints(t.maxPoints());
                    task.setStarterCode(t.starterCode());
                    task.setTests(t.tests());
                    // defaults are in entity (type, language, gradingMode)
                    task = taskRepo.save(task);
                    act.setTask(task);
                }

                activityRepo.save(act);
            }
        }

        return toListItem(lesson);
    }

    /**
     * Usuwa lekcję (wymaga bycia nauczycielem).
     */
    @Transactional
    public void deleteLesson(Long classId, UUID lessonId, UUID userId) {
        Objects.requireNonNull(lessonId, "lessonId");
    requireTeacherMembership(classId, userId);

        Lesson lesson = lessonRepo.findById(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found"));

        if (lesson.getClassroom() == null || !lesson.getClassroom().getId().equals(classId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lesson not in this class");
        }

        lessonRepo.delete(lesson);
    }

    /**
     * Sprawdza czy użytkownik jest nauczycielem lekcji.
     */
    @Transactional(readOnly = true)
    public void requireTeacherOfLesson(UUID lessonId, UUID userId) {
        Objects.requireNonNull(lessonId, "lessonId");
        Lesson lesson = lessonRepo.findById(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found"));

        if (lesson.getClassroom() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lesson has no classroom");
        }

    requireTeacherMembership(lesson.getClassroom().getId(), userId);
    }

    @Transactional(readOnly = true)
    public void requireTeacherMembership(Long classId, UUID userId) {
        var opt = classMemberRepo.findById(new ClassMemberId(classId, userId));
    ClassMember member = opt.orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Nie jesteś członkiem tej klasy"));
        String role = member.getRole();
        if (role == null || !"TEACHER".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tę operację może wykonać tylko nauczyciel tej klasy");
        }
    }

    @Transactional(readOnly = true)
    public com.prolearn.lesson.dto.LessonSummaryDto getLessonSummary(UUID lessonId) {
        Objects.requireNonNull(lessonId, "lessonId");
        if (!lessonRepo.existsById(lessonId)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Lesson not found");
        }

        var tasks = taskRepo.findAllByLesson_IdOrderByCreatedAtAsc(lessonId);
        java.util.List<java.util.UUID> taskIds = tasks.stream().map(t -> t.getId()).toList();
        int totalTasks = taskIds.size();
    // Task.getMaxPoints() is an int in the domain model — map directly to int.
    // If maxPoints can ever be nullable in the future, adjust here accordingly.
    int totalMaxPoints = tasks.stream().mapToInt(t -> t.getMaxPoints()).sum();

        var submissions = submissionRepo.findByTaskIdIn(taskIds);

        java.util.Map<java.util.UUID, java.util.Map<java.util.UUID, com.prolearn.submission.Submission>> latestByStudentAndTask = new java.util.HashMap<>();
        for (var s : submissions) {
            var sid = s.getStudent().getId();
            var taskId = s.getTask().getId();
            var perTask = latestByStudentAndTask.computeIfAbsent(sid, k -> new java.util.HashMap<>());
            var prev = perTask.get(taskId);
            if (prev == null || (s.getCreatedAt() != null && prev.getCreatedAt() != null && s.getCreatedAt().isAfter(prev.getCreatedAt()))) {
                perTask.put(taskId, s);
            }
        }

        java.util.List<com.prolearn.lesson.dto.StudentLessonSummary> students = new java.util.ArrayList<>();
        for (var entry : latestByStudentAndTask.entrySet()) {
            var sid = entry.getKey();
            var latest = entry.getValue();
            int sumPoints = latest.values().stream().mapToInt(s -> s.getPoints() == null ? 0 : s.getPoints()).sum();
            int tasksCompleted = (int) latest.values().stream().filter(s -> s.getPoints() != null).count();
            var user = userRepo.findById(Objects.requireNonNull(sid, "studentId")).orElse(null);
            String email = user == null ? null : user.getEmail();
            String first = user == null ? null : user.getFirstName();
            String last = user == null ? null : user.getLastName();
            students.add(new com.prolearn.lesson.dto.StudentLessonSummary(sid, email, first, last, sumPoints, totalMaxPoints, tasksCompleted, totalTasks));
        }

        return new com.prolearn.lesson.dto.LessonSummaryDto(lessonId, totalTasks, totalMaxPoints, students);
    }

    /**
     * Returns progress matrix for a lesson within a class. Caller must be a teacher of the lesson/class.
     */
    @Transactional(readOnly = true)
    public com.prolearn.lesson.dto.LessonClassProgressDto getClassProgress(Long classId, UUID lessonId, UUID teacherId) {
        if (lessonId != null) {
            requireTeacherOfLesson(lessonId, teacherId);
        } else {
            requireTeacherMembership(classId, teacherId);
        }

        java.util.List<Lesson> lessonScope = new java.util.ArrayList<>();
        if (lessonId != null) {
            Lesson lesson = lessonRepo.findById(lessonId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found"));
            if (lesson.getClassroom() == null || !lesson.getClassroom().getId().equals(classId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lesson not in this class");
            }
            lessonScope.add(lesson);
        } else {
            lessonScope.addAll(lessonRepo.findAllByClassroom_IdOrderByCreatedAtAsc(classId));
        }

        java.util.List<ActivityColumn> columns = collectActiveColumns(lessonScope);

        java.util.List<com.prolearn.lesson.dto.TaskDto> columnDtos = new java.util.ArrayList<>();
        java.util.Map<java.util.UUID, String> columnTypes = new java.util.HashMap<>();
        java.util.List<java.util.UUID> referencedTaskIds = new java.util.ArrayList<>();
        java.util.List<LessonActivity> quizActivities = new java.util.ArrayList<>();

        for (ActivityColumn column : columns) {
            java.util.UUID columnId = column.columnId();
            columnTypes.put(columnId, column.type());
            columnDtos.add(new com.prolearn.lesson.dto.TaskDto(
                    columnId,
                    column.title(),
                    column.maxPoints(),
                    column.type(),
                    column.lesson().getId(),
                    column.lesson().getTitle(),
                    column.activity() == null ? null : column.activity().getId()
            ));
            if ("TASK".equalsIgnoreCase(column.type()) && column.task() != null) {
                referencedTaskIds.add(columnId);
            } else if ("QUIZ".equalsIgnoreCase(column.type()) && column.activity() != null) {
                quizActivities.add(column.activity());
            }
        }

        var submissions = referencedTaskIds.isEmpty()
                ? java.util.Collections.<com.prolearn.submission.Submission>emptyList()
                : submissionRepo.findByTaskIdIn(referencedTaskIds);

        java.util.Map<String, com.prolearn.submission.Submission> latestSubmission = new java.util.HashMap<>();
        for (var submission : submissions) {
            String key = submission.getStudent().getId().toString() + "|" + submission.getTask().getId().toString();
            var prev = latestSubmission.get(key);
            if (prev == null || (submission.getCreatedAt() != null && prev.getCreatedAt() != null && submission.getCreatedAt().isAfter(prev.getCreatedAt()))) {
                latestSubmission.put(key, submission);
            }
        }

        java.util.Map<String, com.prolearn.lesson.QuizAttempt> latestQuizAttempt = new java.util.HashMap<>();
        for (var quiz : quizActivities) {
            if (quiz == null || quiz.getId() == null) {
                continue;
            }
            try {
                var attempts = quizAttemptRepository.findAllByActivity_IdOrderByCreatedAtDesc(quiz.getId());
                java.util.Set<java.util.UUID> seenStudents = new java.util.HashSet<>();
                for (var attempt : attempts) {
                    var studentId = attempt.getStudentId();
                    if (studentId == null || !seenStudents.add(studentId)) continue;
                    String key = studentId.toString() + "|" + quiz.getId().toString();
                    latestQuizAttempt.put(key, attempt);
                }
            } catch (Exception ex) {
                // ignore quiz fetch errors per activity
            }
        }

        var members = classMemberRepo.findByIdClassId(classId).stream()
                .filter(m -> m.getRole() == null || !"TEACHER".equalsIgnoreCase(m.getRole()))
                .toList();

        java.util.List<com.prolearn.lesson.dto.StudentDto> studentDtos = new java.util.ArrayList<>();
        java.util.Set<java.util.UUID> seenStudents = new java.util.HashSet<>();
        for (var member : members) {
            var studentId = member.getMember().getId();
            if (seenStudents.add(studentId)) {
                studentDtos.add(new com.prolearn.lesson.dto.StudentDto(studentId, member.getMember().getEmail(), member.getMember().getFirstName(), member.getMember().getLastName()));
            }
        }

        java.util.List<com.prolearn.lesson.dto.StudentTaskResultDto> results = new java.util.ArrayList<>();
        for (var student : studentDtos) {
            for (var column : columnDtos) {
                String key = student.getStudentId().toString() + "|" + column.getTaskId().toString();
                String type = columnTypes.getOrDefault(column.getTaskId(), "TASK");
                String status = "NOT_STARTED";
                Integer points = null;

                if ("TASK".equalsIgnoreCase(type)) {
                    var submission = latestSubmission.get(key);
                    if (submission != null) {
                        Integer graded = submission.getPoints();
                        Integer auto = submission.getAutoScore();
                        if (graded != null) {
                            status = "DONE";
                            points = graded;
                        } else if (auto != null) {
                            status = "IN_PROGRESS";
                            points = auto;
                        } else {
                            status = "IN_PROGRESS";
                        }
                    }
                } else if ("QUIZ".equalsIgnoreCase(type)) {
                    var attempt = latestQuizAttempt.get(key);
                    if (attempt != null) {
                        status = "DONE";
                        points = attempt.getPoints();
                    }
                }

                results.add(new com.prolearn.lesson.dto.StudentTaskResultDto(student.getStudentId(), column.getTaskId(), status, points));
            }
        }

        return new com.prolearn.lesson.dto.LessonClassProgressDto(classId, lessonId, studentDtos, columnDtos, results);
    }

    /**
     * Returns an overview matrix: students × lessons in the class.
     * Each cell contains aggregated counts (tasksCompleted, totalTasks, pointsEarned, maxPoints).
     */
    @Transactional(readOnly = true)
    public com.prolearn.lesson.dto.ClassProgressOverviewDto getClassProgressOverview(Long classId, UUID teacherId) {
    requireTeacherMembership(classId, teacherId);

        var lessons = lessonRepo.findAllByClassroom_IdOrderByCreatedAtAsc(classId);

        java.util.List<ActivityColumn> columns = collectActiveColumns(lessons);

        java.util.Map<java.util.UUID, java.util.List<ActivityColumn>> columnsByLesson = new java.util.LinkedHashMap<>();
        for (var lesson : lessons) {
            columnsByLesson.put(lesson.getId(), new java.util.ArrayList<>());
        }
        for (ActivityColumn column : columns) {
            columnsByLesson.computeIfAbsent(column.lesson().getId(), k -> new java.util.ArrayList<>()).add(column);
        }

        java.util.Map<java.util.UUID, Integer> lessonTaskCount = new java.util.HashMap<>();
        java.util.Map<java.util.UUID, Integer> lessonMaxPoints = new java.util.HashMap<>();
        java.util.List<com.prolearn.lesson.dto.LessonOverviewDto> lessonDtos = new java.util.ArrayList<>();
        for (var lesson : lessons) {
            var lessonColumns = columnsByLesson.getOrDefault(lesson.getId(), java.util.Collections.emptyList());
            int totalTasks = lessonColumns.size();
        int totalMaxPoints = lessonColumns.stream()
            .map(ActivityColumn::maxPoints)
            .filter(java.util.Objects::nonNull)
            .mapToInt(Integer::intValue)
            .sum();
            lessonTaskCount.put(lesson.getId(), totalTasks);
            lessonMaxPoints.put(lesson.getId(), totalMaxPoints);
            lessonDtos.add(new com.prolearn.lesson.dto.LessonOverviewDto(lesson.getId(), lesson.getTitle(), totalTasks, totalMaxPoints));
        }

        var members = classMemberRepo.findByIdClassId(classId).stream()
                .filter(m -> m.getRole() == null || !"TEACHER".equalsIgnoreCase(m.getRole()))
                .toList();

        java.util.List<com.prolearn.lesson.dto.StudentDto> studentDtos = new java.util.ArrayList<>();
        java.util.Set<java.util.UUID> seenStudents = new java.util.HashSet<>();
        for (var member : members) {
            var sid = member.getMember().getId();
            if (seenStudents.add(sid)) {
                studentDtos.add(new com.prolearn.lesson.dto.StudentDto(sid, member.getMember().getEmail(), member.getMember().getFirstName(), member.getMember().getLastName()));
            }
        }

        java.util.List<java.util.UUID> referencedTaskIds = new java.util.ArrayList<>();
        java.util.Map<java.util.UUID, java.util.UUID> taskToLesson = new java.util.HashMap<>();
        for (ActivityColumn column : columns) {
            if ("TASK".equalsIgnoreCase(column.type()) && column.task() != null) {
                referencedTaskIds.add(column.columnId());
                taskToLesson.put(column.columnId(), column.lesson().getId());
            }
        }

        var submissions = referencedTaskIds.isEmpty()
                ? java.util.Collections.<com.prolearn.submission.Submission>emptyList()
                : submissionRepo.findByTaskIdIn(referencedTaskIds);

        java.util.Map<String, com.prolearn.submission.Submission> latestSubmission = new java.util.HashMap<>();
        for (var submission : submissions) {
            String key = submission.getStudent().getId().toString() + "|" + submission.getTask().getId().toString();
            var prev = latestSubmission.get(key);
            if (prev == null || (submission.getCreatedAt() != null && prev.getCreatedAt() != null && submission.getCreatedAt().isAfter(prev.getCreatedAt()))) {
                latestSubmission.put(key, submission);
            }
        }

        class StudentLessonAggregate {
            int tasksCompleted;
            int pointsEarned;
        }

        java.util.Map<java.util.UUID, java.util.Map<java.util.UUID, StudentLessonAggregate>> aggregates = new java.util.HashMap<>();
        for (var entry : latestSubmission.entrySet()) {
            var submission = entry.getValue();
            var sid = submission.getStudent().getId();
            var taskId = submission.getTask().getId();
            var lessonForTask = taskToLesson.get(taskId);
            if (lessonForTask == null) continue;
            var perLesson = aggregates.computeIfAbsent(sid, k -> new java.util.HashMap<>());
            StudentLessonAggregate agg = perLesson.computeIfAbsent(lessonForTask, k -> new StudentLessonAggregate());
            Integer graded = submission.getPoints();
            Integer auto = submission.getAutoScore();
            Integer best = graded != null ? graded : auto;
            if (best != null) {
                agg.pointsEarned += best;
                agg.tasksCompleted += 1;
            }
        }

        java.util.Map<java.util.UUID, java.util.Map<java.util.UUID, Integer>> quizPointsByStudentByLesson = new java.util.HashMap<>();
        java.util.Map<java.util.UUID, java.util.Map<java.util.UUID, Integer>> quizCompletedByStudentByLesson = new java.util.HashMap<>();
        for (ActivityColumn column : columns) {
            if (!"QUIZ".equalsIgnoreCase(column.type()) || column.activity() == null || column.activity().getId() == null) {
                continue;
            }
            try {
                var attempts = quizAttemptRepository.findAllByActivity_IdOrderByCreatedAtDesc(column.activity().getId());
                java.util.Set<java.util.UUID> seen = new java.util.HashSet<>();
                for (var attempt : attempts) {
                    var sid = attempt.getStudentId();
                    if (sid == null || !seen.add(sid)) continue;
            int pts = attempt.getPoints();
            var perLessonPoints = quizPointsByStudentByLesson.computeIfAbsent(sid, k -> new java.util.HashMap<>());
            var lessonId = column.lesson().getId();
            perLessonPoints.put(lessonId, perLessonPoints.getOrDefault(lessonId, 0) + pts);
            var perLessonCompleted = quizCompletedByStudentByLesson.computeIfAbsent(sid, k -> new java.util.HashMap<>());
            perLessonCompleted.put(lessonId, perLessonCompleted.getOrDefault(lessonId, 0) + 1);
                }
            } catch (Exception ex) {
                // ignore quiz attempt fetch issues
            }
        }

        java.util.List<com.prolearn.lesson.dto.StudentLessonOverviewDto> results = new java.util.ArrayList<>();
        for (var student : studentDtos) {
            var sid = student.getStudentId();
            var perLesson = aggregates.getOrDefault(sid, java.util.Collections.emptyMap());
            var quizPts = quizPointsByStudentByLesson.getOrDefault(sid, java.util.Collections.emptyMap());
            var quizCompleted = quizCompletedByStudentByLesson.getOrDefault(sid, java.util.Collections.emptyMap());
            for (var lesson : lessons) {
                var agg = perLesson.get(lesson.getId());
                int pointsEarned = agg != null ? agg.pointsEarned : 0;
                int tasksCompleted = agg != null ? agg.tasksCompleted : 0;
                pointsEarned += quizPts.getOrDefault(lesson.getId(), 0);
                tasksCompleted += quizCompleted.getOrDefault(lesson.getId(), 0);
                int totalTasks = lessonTaskCount.getOrDefault(lesson.getId(), 0);
                int maxPoints = lessonMaxPoints.getOrDefault(lesson.getId(), 0);
                results.add(new com.prolearn.lesson.dto.StudentLessonOverviewDto(sid, lesson.getId(), tasksCompleted, totalTasks, pointsEarned, maxPoints));
            }
        }

        return new com.prolearn.lesson.dto.ClassProgressOverviewDto(classId, lessonDtos, studentDtos, results);
    }

    private java.util.List<ActivityColumn> collectActiveColumns(java.util.List<Lesson> lessonScope) {
        java.util.List<ActivityColumn> columns = new java.util.ArrayList<>();
        java.util.Set<java.util.UUID> seenColumns = new java.util.HashSet<>();
    java.util.Map<java.util.UUID, Integer> lessonOrder = new java.util.HashMap<>();
    java.util.Map<java.util.UUID, Integer> lessonSequence = new java.util.HashMap<>();
        if (lessonScope == null || lessonScope.isEmpty()) {
            return columns;
        }
        for (int idx = 0; idx < lessonScope.size(); idx++) {
            Lesson lesson = lessonScope.get(idx);
            if (lesson != null && lesson.getId() != null) {
                lessonOrder.putIfAbsent(lesson.getId(), idx);
            }
        }
        for (Lesson lesson : lessonScope) {
            if (lesson == null || lesson.getId() == null) {
                continue;
            }
            var activities = activityRepo.findAllByLesson_IdOrderByOrderIndexAsc(lesson.getId());
            for (LessonActivity activity : activities) {
                if (activity == null) {
                    continue;
                }
                String type = activity.getType() == null ? "" : activity.getType();
                int orderIndex = activity.getOrderIndex();
                int sequence = lessonSequence.getOrDefault(lesson.getId(), 0);
                lessonSequence.put(lesson.getId(), sequence + 1);
                if ("TASK".equalsIgnoreCase(type)) {
                    var task = activity.getTask();
                    if (task == null || task.getId() == null) {
                        continue;
                    }
                    if (seenColumns.add(task.getId())) {
                        String title = task.getTitle() != null ? task.getTitle() : (activity.getTitle() != null ? activity.getTitle() : "Zadanie");
                        columns.add(new ActivityColumn(task.getId(), "TASK", lesson, activity, title, Integer.valueOf(task.getMaxPoints()), task, orderIndex, sequence));
                    }
                } else if ("QUIZ".equalsIgnoreCase(type)) {
                    if (activity.getId() == null) {
                        continue;
                    }
                    if (seenColumns.add(activity.getId())) {
                        String title = activity.getTitle() != null ? activity.getTitle() : "Quiz";
                        int maxPoints = resolveQuizMaxPoints(activity);
                        columns.add(new ActivityColumn(activity.getId(), "QUIZ", lesson, activity, title, Integer.valueOf(maxPoints), null, orderIndex, sequence));
                    }
                }
            }
        }
        columns.sort((a, b) -> {
            int posA = a.lesson() != null && a.lesson().getId() != null ? lessonOrder.getOrDefault(a.lesson().getId(), Integer.MAX_VALUE) : Integer.MAX_VALUE;
            int posB = b.lesson() != null && b.lesson().getId() != null ? lessonOrder.getOrDefault(b.lesson().getId(), Integer.MAX_VALUE) : Integer.MAX_VALUE;
            if (posA != posB) return Integer.compare(posA, posB);
            int orderCompare = Integer.compare(a.activityOrder(), b.activityOrder());
            if (orderCompare != 0) return orderCompare;
            return Integer.compare(a.sequence(), b.sequence());
        });
        return columns;
    }

    private record ActivityColumn(java.util.UUID columnId,
                                  String type,
                                  Lesson lesson,
                                  LessonActivity activity,
                                  String title,
                                  Integer maxPoints,
                                  com.prolearn.task.Task task,
                                  int activityOrder,
                                  int sequence) {
    }

    private LessonStats calculateLessonStats(Lesson lesson) {
        if (lesson == null || lesson.getId() == null) {
            return LessonStats.empty();
        }
        var activities = activityRepo.findAllByLesson_IdOrderByOrderIndexAsc(lesson.getId());
        int blocks = 0;
        int tasks = 0;
        int quizzes = 0;
        int maxPoints = 0;

        for (LessonActivity activity : activities) {
            if (activity == null) {
                continue;
            }
            blocks++;
            String type = activity.getType() == null ? "" : activity.getType();
            if ("TASK".equalsIgnoreCase(type)) {
                tasks++;
                var task = activity.getTask();
                if (task != null) {
                    maxPoints += Math.max(0, task.getMaxPoints());
                }
            } else if ("QUIZ".equalsIgnoreCase(type)) {
                quizzes++;
                maxPoints += Math.max(0, resolveQuizMaxPoints(activity));
            }
        }

        return new LessonStats(blocks, tasks, quizzes, maxPoints);
    }

    private record LessonStats(int blocksCount, int tasksCount, int quizzesCount, int maxPoints) {
        private static LessonStats empty() {
            return new LessonStats(0, 0, 0, 0);
        }
    }

    private int resolveQuizMaxPoints(LessonActivity activity) {
        int defaultPoints = 10;
        if (activity == null) {
            return defaultPoints;
        }
        try {
            var body = activity.getBody();
            if (body == null || body.isBlank()) {
                return defaultPoints;
            }
            var root = objectMapper.readTree(body);
            if (root.has("maxPoints") && root.get("maxPoints").isInt()) {
                int parsed = root.get("maxPoints").asInt();
                return Math.max(0, parsed);
            }
        } catch (Exception ex) {
            // ignore invalid quiz body and fall back to default
        }
        return defaultPoints;
    }

    /**
     * Mapuje encję Lesson na LessonListItem.
     */
    private LessonListItem toListItem(Lesson lesson) {
        LessonStats stats = calculateLessonStats(lesson);
        return new LessonListItem(
                lesson.getId(),
                lesson.getTitle(),
                lesson.getCreatedAt(),
                stats.blocksCount(),
                stats.tasksCount(),
                stats.quizzesCount(),
                stats.maxPoints()
        );
    }
}

