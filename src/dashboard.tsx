import { useCallback, useEffect, useState } from "react";
import { supabase, Calendar } from "./services";
import { PostgrestError, Session } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "./components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertDialogTriggerProps } from "node_modules/@radix-ui/react-alert-dialog/dist";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "./components/ui/textarea";
import DateTimePicker from "react-datetime-picker";
import { TASK_TABLE_NAME } from "./constants";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";

type Task = {
  id: string;
  title: string;
  description: string;
  reminder_time: Date;
  created_at: Date;
  completed: boolean;
  event_id?: string;
};

type Mode = "create" | "edit";

type Props = {
  session: Session;
};

export function Dashboard({ session }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask] = useState<Task>({
    id: "",
    title: "",
    description: "",
    created_at: new Date(),
    reminder_time: new Date(),
    completed: false,
  });

  const [error, setError] = useState<PostgrestError | null>(null);
  const { toast } = useToast();
  const [date, setDate] = useState(new Date());
  const user = session.user;

  const currentDate = date.toISOString().split("T")[0];
  // Construct start and end of the day timestamps
  const startOfDay = `${currentDate}T00:00:00+00:00`;
  const endOfDay = `${currentDate}T23:59:59+00:00`;

  const getTasks = useCallback(async (start: string, end: string) => {
    const { data, error } = await supabase
      .from(TASK_TABLE_NAME)
      .select("*")
      .gte("reminder_time::date", start)
      .lte("reminder_time::date", end)
      .order("reminder_time", { ascending: true });
    if (error) {
      return setError(error);
    }
    return setTasks(data);
  }, []);

  useEffect(() => {
    getTasks(startOfDay, endOfDay);
  }, [getTasks, startOfDay, endOfDay]);

  useEffect(() => {
    if (error) {
      toast({
        title: error.message,
        description: error.details,
      });
    }
  }, [error, toast]);

  useEffect(() => {
    // Listen to inserts
    supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        () => getTasks(startOfDay, endOfDay),
      )
      .subscribe();
  });

  const deleteTask = async (task: Task) => {
    const calendar = new Calendar(session.provider_token || "");
    await calendar.deleteEvent(task.event_id!);
    supabase
      .from(TASK_TABLE_NAME)
      .delete()
      .eq("id", task.id)
      .then(({ error }) => {
        if (error) {
          return setError(error);
        }
        toast({
          title: "Task deleted",
          description: "Task has been deleted",
        });
      });
  };

  const completeTask = async (id: string) => {
    supabase
      .from(TASK_TABLE_NAME)
      .update({ completed: true })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          return setError(error);
        }
        toast({
          title: "Task completed",
          description: "Task has been marked as completed",
        });
      });
  };

  return (
    <div className="flex flex-col w-screen bg-gray-800 h-screen">
      <Toaster />
      <div className="flex justify-between items-center p-4 text-white">
        <h1 className="text-2xl">
          Task board for{" "}
          <input
            type="date"
            value={date.toISOString().split("T")[0]}
            onChange={(e) => setDate(new Date(e.target.value))}
            className="bg-gray-800"
          />
        </h1>
        <div className="flex flex-col sm:flex-row md:justify-end">
          <span className="m-2">{user?.email}</span>
          <ConfirmDialog
            title="Sign Out"
            description="Are you sure you want to sign out?"
            confirm={() => {
              supabase.auth.signOut();
            }}
            trigger={
              <AlertDialogTrigger asChild>
                <button className="bg-red-500 text-white px-4 py-2 rounded">
                  Sign Out
                </button>
              </AlertDialogTrigger>
            }
          />
        </div>
      </div>
      <div className="flex flex-col flex-1 px-4">
        <div className="flex flex-row gap-2 flex-wrap">
          {tasks.map((task) => (
            <div key={task.id} className="w-72">
              <Card className={`h-60 ${task.completed ? "bg-gray-300" : ""} `}>
                <CardHeader>
                  <CardTitle className={task.completed ? "line-through" : ""}>
                    {task.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription
                    className={task.completed ? "line-through" : ""}
                  >
                    {task.description}
                  </CardDescription>
                </CardContent>
                <CardFooter
                  className={`gap-1 ${task.completed ? "hidden" : "flex-row"}`}
                >
                  <TaskDialog
                    mode={"edit"}
                    session={session}
                    task={task}
                    trigger={
                      <DialogTrigger asChild>
                        <button className="bg-orange-500 text-white px-2 py-2 rounded">
                          Edit
                        </button>
                      </DialogTrigger>
                    }
                  />
                  <ConfirmDialog
                    title="Delete Task"
                    description="Are you sure you want to delete this task? This action cannot be undone."
                    confirm={() => deleteTask(task)}
                    trigger={
                      <AlertDialogTrigger asChild>
                        <button className="bg-red-500 text-white px-4 py-2 rounded">
                          Delete
                        </button>
                      </AlertDialogTrigger>
                    }
                  />
                  <ConfirmDialog
                    title="Complete Task"
                    description="Have you completed the task? This cannot be undone"
                    confirm={() => completeTask(task.id)}
                    trigger={
                      <AlertDialogTrigger asChild>
                        <button className="bg-green-500 text-white px-4 py-2 rounded">
                          Done
                        </button>
                      </AlertDialogTrigger>
                    }
                  />
                </CardFooter>
              </Card>
            </div>
          ))}
          <div className="w-72">
            <Card className="h-60">
              <CardHeader>
                <CardTitle>Create Task</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Task description. Tasks can only be created for today or
                  tomorrow.Stick to about 3-4 tasks a day.
                </CardDescription>
              </CardContent>
              <CardFooter>
                <TaskDialog
                  mode={"create"}
                  session={session}
                  task={newTask}
                  trigger={
                    <DialogTrigger asChild>
                      <button className="bg-blue-500 text-white px-4 py-2 mr-1 rounded">
                        Create
                      </button>
                    </DialogTrigger>
                  }
                />
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  trigger,
  confirm,
  title,
  description,
}: {
  trigger: React.ReactElement<
    AlertDialogTriggerProps,
    typeof AlertDialogTrigger
  >;
  confirm: () => void;
  title: string;
  description: string;
}) {
  return (
    <AlertDialog>
      {trigger}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type TaskProps = {
  task: Task;
  mode: Mode;
  trigger: React.ReactElement<
    AlertDialogTriggerProps,
    typeof AlertDialogTrigger
  >;
  session: Session;
};

function TaskDialog({ task, mode, trigger, session }: TaskProps) {
  const formSchema = z.object({
    title: z.string().min(2, {
      message: "Task title must be at least 2 characters.",
    }),
    description: z.string().min(10, {
      message: "Task description must be at least 10 characters.",
    }),
    // date should be either today or tommorrow
    reminder_time: z.date(),
    completed: z.boolean(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      reminder_time: task.reminder_time,
      completed: task.completed,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  const { toast } = useToast();
  const calendar = new Calendar(session.provider_token || "");

  useEffect(() => {
    if (error) {
      toast({
        title: error.message,
        description: error.details,
      });
    }
  }, [error, toast]);

  const createEvent = async (t: z.infer<typeof formSchema>) => {
    const event = await calendar.createEvent({
      summary: t.title,
      description: t.description,
      start: {
        dateTime: t.reminder_time.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: t.reminder_time.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    return event;
  };

  const updateEvent = async (t: z.infer<typeof formSchema>) => {
    const event = await calendar.updateEvent(
      {
        summary: t.title,
        description: t.description,
        start: {
          dateTime: t.reminder_time.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: t.reminder_time.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      task.event_id,
    );
    return event;
  };

  const handleCreate = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const event = await createEvent(values);
      const { error } = await supabase
        .from(TASK_TABLE_NAME)
        .insert({ ...values, user_id: session.user?.id, event_id: event.id });
      setError(error);
      if (!error) {
        toast({
          title: "Task created",
          description: "Task has been created",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleUpdate = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const event = await updateEvent(values);
      const { error } = await supabase
        .from(TASK_TABLE_NAME)
        .update({ ...values, event_id: event.id })
        .eq("id", task.id);
      setError(error);
      if (!error) {
        toast({
          title: "Task updated",
          description: "Task has been updated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    if (mode === "create") {
      return handleCreate(values);
    }
    return handleUpdate(values);
  }

  const title = mode === "create" ? "Create Task" : "Edit Task";

  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Read book" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the title of your task
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Read lord of the rings"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This is the description of your task
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reminder_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block">Reminder</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          className="w-full"
                          {...field}
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        When should we remind you?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {mode === "edit" ? (
                  <FormField
                    control={form.control}
                    name="completed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Input
                            type="checkbox"
                            size={1}
                            className="border-gray-300 bg-white text-gray-900
                                       focus:ring-gray-400 focus:ring-offset-white
                                       checked:bg-white checked:border-gray-400
                                       hover:bg-gray-100
                                       data-[state=checked]:bg-white data-[state=checked]:text-gray-900 h-10 w-10"
                            {...field}
                            value={field.value as unknown as string}
                          />
                        </FormControl>
                        <FormDescription>
                          Have you completed this task?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <Button disabled={loading} type="submit">
                  Submit
                </Button>
              </form>
            </Form>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
