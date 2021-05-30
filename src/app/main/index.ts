import { BrowserWindow } from "electron";
import { runClientApp } from "@/app/main/runClient";
import { runServerApp } from "@/app/main/runServer";

export function runApp(mainWindow: BrowserWindow): void {
  runServerApp(mainWindow);
  runClientApp(mainWindow);
}
