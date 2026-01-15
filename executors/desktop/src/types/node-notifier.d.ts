declare module "node-notifier" {
  interface NotificationOptions {
    title?: string;
    message?: string;
    icon?: string;
    sound?: boolean | string;
    wait?: boolean;
    timeout?: number;
  }

  interface Notifier {
    notify(options: NotificationOptions, callback?: (err: Error | null, response: string) => void): Notifier;
  }

  const notifier: Notifier;
  export = notifier;
}
