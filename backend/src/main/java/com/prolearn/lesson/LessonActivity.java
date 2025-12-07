package com.prolearn.lesson;

import com.prolearn.task.Task;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lesson_activities")
public class LessonActivity {
    @Id @Column(columnDefinition = "uuid") private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "a_type", nullable = false, length = 16)
    private String type; // CONTENT | TASK

    @Column(length = 200) private String title;
    @Column(columnDefinition = "text") private String body; // JSON jako TEXT

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task; // dla type=TASK

    @Column(name = "order_index", nullable = false) private int orderIndex = 0;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    // get/set
    public UUID getId(){return id;}
    public Lesson getLesson(){return lesson;}
    public void setLesson(Lesson lesson){this.lesson = lesson;}
    public String getType(){return type;}
    public void setType(String type){this.type = type;}
    public String getTitle(){return title;}
    public void setTitle(String title){this.title = title;}
    public String getBody(){return body;}
    public void setBody(String body){this.body = body;}
    public Task getTask(){return task;}
    public void setTask(Task task){this.task = task;}
    public int getOrderIndex(){return orderIndex;}
    public void setOrderIndex(int orderIndex){this.orderIndex = orderIndex;}
    public Instant getCreatedAt(){return createdAt;}
    public void setCreatedAt(Instant createdAt){this.createdAt = createdAt;}
}
