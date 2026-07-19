package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.MaintenanceBlockDto;

public class MaintenanceBlockResponse {
    private boolean success;
    private String message;
    private List<MaintenanceBlockDto> blocks;
    private MaintenanceBlockDto block;

    public MaintenanceBlockResponse() {}

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<MaintenanceBlockDto> getBlocks() { return blocks; }
    public void setBlocks(List<MaintenanceBlockDto> blocks) { this.blocks = blocks; }

    public MaintenanceBlockDto getBlock() { return block; }
    public void setBlock(MaintenanceBlockDto block) { this.block = block; }
}
