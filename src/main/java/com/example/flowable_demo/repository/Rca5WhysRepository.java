package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.Rca5Whys;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Rca5WhysRepository extends JpaRepository<Rca5Whys, Long> {
}
