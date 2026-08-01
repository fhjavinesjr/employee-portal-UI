import { ReactElement } from "react";

export interface MenuItemProps {
  icon: string | ReactElement;   // allow both
  label: string;
  goto: string;
  isActive?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}
