"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

import Ustyles from "@/styles/userprofile.module.scss";
import modalStyles from "@/styles/Modal.module.scss";

import { localStorageUtil } from "@/lib/utils/localStorageUtil";
import { fetchPersonalData } from "@/lib/services/api";
import { PersonalData } from "@/lib/types/PersonalData";

export default function ProfilePage() {
  const [profile, setProfile] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const employeeId = localStorageUtil.getEmployeeId();

    if (!employeeId) {
      return;
    }

    fetchPersonalData(employeeId)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={modalStyles.Modal}>Loading profile...</div>;
  }

  if (!profile) {
    return <div className={modalStyles.Modal}>Profile not found</div>;
  }

  const fullName = `${profile.firstname} ${profile.middlename} ${profile.surname}`;
  const biometricNo = localStorageUtil.getBiometricNo();
  const employeeNo = localStorageUtil.getEmployeeNo();

  const profileImage =
    (profile.employeePicture
      ? `data:image/jpeg;base64,${profile.employeePicture}`
      : "/default-avatar.jpg");

  return (
    <div id="Profile" className={modalStyles.Modal}>
      <div className={modalStyles.modalContent}>

        {/* Header */}
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.mainTitle}>Profile</h2>
        </div>

        <form className={modalStyles.modalBody}>

          {/* Profile Header */}
          <div className={Ustyles.ProfileWrapper}>
            <div className={Ustyles.profilePictureContainer}>
              <Image
                src={profileImage}
                width={155}
                height={155}
                alt="Profile"
                className={Ustyles.profilePicture}
              />

              {/* <button
                type="button"
                className={Ustyles.uploadButton}
                onClick={() => document.getElementById("fileInput")?.click()}
              > */}
                {/* <FaCamera /> */}
              {/* </button> */}

              {/* <input
                type="file"
                id="fileInput"
                accept="image/*"
                onChange={handleFileUpload}
                hidden
              /> */}
            </div>

            <div className={Ustyles.userInfo}>
              <h2 className={Ustyles.name}>{fullName}</h2>
              <p className={Ustyles.email}>{profile.email}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className={Ustyles.formGrid}>
            <div className={Ustyles.formGroup}>
              <label>Employee No.</label>
              <p className={Ustyles.staticField}>{employeeNo}</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Biometric No.</label>
              <p className={Ustyles.staticField}>{biometricNo}</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Full Name</label>
              <p className={Ustyles.staticField}>{fullName}</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Mobile No.</label>
              <p className={Ustyles.staticField}>{profile.mobileNo}</p>
            </div>

            <div className={Ustyles.formGroup}>
              <label>Email Address</label>
              <p className={Ustyles.staticField}>{profile.email}</p>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}