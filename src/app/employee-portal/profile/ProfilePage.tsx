"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FaCamera } from "react-icons/fa";
import Ustyles from "@/styles/userprofile.module.scss";
import modalStyles from "@/styles/Modal.module.scss";

export default function ProfilePage() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target?.result?.toString() || null;
        setUploadedFile(base64Image);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div id="Profile" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>

        {/* Title Section */}
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Profile</h2>
        </div>

        {/* Form Section */}
        <form className={modalStyles.modalBody}>

          {/* Profile Header */}
          <div className={Ustyles.ProfileWrapper}>
            <div className={Ustyles.profilePictureContainer}>
              <Image
                src={uploadedFile || "/default-avatar.jpg"}
                width={150}
                height={150}
                alt="Profile"
                className={Ustyles.profilePicture}
              />

              <button
                type="button"
                className={Ustyles.uploadButton}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                <FaCamera />
              </button>

              <input
                type="file"
                id="fileInput"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </div>

            <div className={Ustyles.userInfo}>
              <h2 className={Ustyles.name}>Dan Joseph G. Haban</h2>
              <p className={Ustyles.email}>danjosephhaban@gmail.com</p>
            </div>
          </div>

          {/* Grid Form Section */}
          <div className={Ustyles.formGrid}>
            <div className={Ustyles.formGroup}>
              <label>Employee No.</label>
              <p className={Ustyles.staticField}>001</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Biometric No.</label>
              <p className={Ustyles.staticField}>BJ-77821</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Full Name</label>
              <p className={Ustyles.staticField}>Dan Joseph G. Haban</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Mobile No.</label>
              <p className={Ustyles.staticField}>0969-999-6789</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Email Address</label>
              <p className={Ustyles.staticField}>danjosephhaban@gmail.com</p>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
