package com.prolearn.task;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "programming_test_cases")
public class ProgrammingTestCase {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "input_text", columnDefinition = "text")
    private String input;

    @Column(name = "expected_text", columnDefinition = "text")
    private String expected;

    @Column(nullable = false)
    private boolean visible = true;

    @Column(nullable = false)
    private int points = 0;

    @Column(name = "ordering", nullable = false)
    private int order = 0;
    
    @Column(nullable = false, length = 16)
    private String mode = "EVAL"; // 'EVAL' (default for JS) or 'IO' (stdin/stdout)

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    // --- getters / setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }

    public String getInput() { return input; }
    public void setInput(String input) { this.input = input; }

    public String getExpected() { return expected; }
    public void setExpected(String expected) { this.expected = expected; }

    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }

    public int getPoints() { return points; }
    public void setPoints(int points) { this.points = points; }

    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }
    
    public String getMode() { return mode; }
    public void setMode(String mode) {
        if (mode == null) { this.mode = "EVAL"; return; }
        String m = mode.equalsIgnoreCase("IO") ? "IO" : "EVAL";
        this.mode = m;
    }
}
