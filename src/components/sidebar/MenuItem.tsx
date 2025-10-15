import React from 'react';
import styles from "@/styles/DashboardSidebar.module.scss";
import { MenuItemProps } from './types';
import Image from "next/image";
import Link from "next/link";

export const MenuItem: React.FC<MenuItemProps> = ({ icon, label, isActive, goto, onClick }) => {
  const className = isActive ? styles.activeMenuItem : styles.menuItem;

  return (
    <Link href={goto} className={className} role="menuitem" tabIndex={0} onClick={onClick}>
      {/* If icon is string, render Image. If it's a React element (Heroicon), render directly */}
      {typeof icon === "string" ? (
        <Image loading="lazy" src={icon} className={styles.menuIcon} alt="" width={20} height={20} />
      ) : (
        <span className={styles.menuIcon}>{icon}</span>
      )}
      <span className={styles.menuLabel}>{label}</span>
    </Link>
  );
};
