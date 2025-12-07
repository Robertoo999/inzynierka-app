package com.prolearn.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProgrammingTestCaseRepository extends JpaRepository<ProgrammingTestCase, UUID> {
    List<ProgrammingTestCase> findByTaskIdOrderByOrderAsc(UUID taskId);

    @Query("select coalesce(sum(t.points),0) from ProgrammingTestCase t where t.task.id = :taskId")
    Integer sumPointsByTaskId(@Param("taskId") UUID taskId);
}
