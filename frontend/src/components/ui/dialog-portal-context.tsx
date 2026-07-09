"use client";

import * as React from "react";

const DialogPortalContainerContext = React.createContext<HTMLElement | null>(
  null,
);

function useDialogPortalContainer() {
  return React.useContext(DialogPortalContainerContext);
}

export { DialogPortalContainerContext, useDialogPortalContainer };
