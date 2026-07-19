package org.lpu.dev.codes.services;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import net.coobird.thumbnailator.Thumbnails;

@Service
public class VehicleImageService {
	private static final Logger logger =
            LogManager.getLogger(VehicleImageService.class);
	
	@Transactional
	public String saveImage(String base64Image) throws IOException {
		logger.warn("saveimage called");
		
	    if (base64Image == null || base64Image.isBlank()) {
	        return "/uploads/vehicles/default.webp";
	    }

	    // Remove data:image/...;base64,
	    String[] parts = base64Image.split(",");
	    String imageData = parts.length > 1 ? parts[1] : parts[0];

	    byte[] imageBytes = Base64.getDecoder().decode(imageData);

	    String fileName = UUID.randomUUID() + ".webp";

	    Path uploadDir = Paths.get(
	            System.getProperty("catalina.base"),
	            "webapps",
	            "uploads",
	            "vehicles");

	    Files.createDirectories(uploadDir);

	    Path filePath = uploadDir.resolve(fileName);
	   
	    try (InputStream in = new ByteArrayInputStream(imageBytes);
	         OutputStream out = Files.newOutputStream(filePath)) {

	        // Resize so longest side is 600px
	        Thumbnails.of(in)
	                .size(500, 500)
	                .outputFormat("jpg")
	                .outputQuality(0.8f)
	                .keepAspectRatio(true)
	                .toOutputStream(out);
	    }catch(Exception e) {
	    	logger.error(e.getMessage());
	    }
	    logger.error("/uploads/vehicles/" + fileName);
	    return "/uploads/vehicles/" + fileName;
	}

}