package com.thrissurvehirental.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;

public final class CloudinaryUploader {
    private static final String CLOUDINARY_URL = System.getenv("CLOUDINARY_URL");
    private static final Cloudinary CLOUDINARY =
        (CLOUDINARY_URL != null && !CLOUDINARY_URL.isBlank()) ? new Cloudinary(CLOUDINARY_URL) : null;

    private CloudinaryUploader() {}

    public static boolean isEnabled() {
        return CLOUDINARY != null;
    }

    public static String upload(byte[] bytes) throws IOException {
        Map<?, ?> result = CLOUDINARY.uploader().upload(bytes,
            ObjectUtils.asMap("folder", "vehicles", "resource_type", "image"));
        return (String) result.get("secure_url");
    }
}
