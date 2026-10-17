package com.thrissurvehirental.model;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

@Entity
@DiscriminatorValue("SCOOTER")
public class Scooter extends Vehicle {

    @Column(name = "engine_cc")
    private Integer engineCc;

    public Scooter() {
        super();
    }

    public Integer getEngineCc() {
        return engineCc;
    }

    public void setEngineCc(Integer engineCc) {
        this.engineCc = engineCc;
    }
}
