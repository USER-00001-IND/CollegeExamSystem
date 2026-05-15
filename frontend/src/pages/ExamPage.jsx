import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Webcam from "react-webcam";
import API from "../services/api";
import "../styles/exam.css";

const shuffleArray = (array, seed) => {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = (seed + i) % arr.length;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
};

function ExamPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const exam = location.state?.exam;

  const user = useMemo(() => {
    return JSON.parse(localStorage.getItem("user"));
  }, []);

 
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [reviewedQuestions, setReviewedQuestions] = useState({});
  const [violations, setViolations] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [lastSavedTime, setLastSavedTime] = useState(null);

  const [permissionReady, setPermissionReady] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);

  const webcamRef = useRef(null);
  const answersRef = useRef([]);
  const reviewedQuestionsRef = useRef({});
  const submittedRef = useRef(false);
  const examStartedRef = useRef(false);

  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    reviewedQuestionsRef.current = reviewedQuestions;
  }, [reviewedQuestions]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    if (!exam || !user) return;

    const loadServerTimer = async () => {
      try {
        const res = await API.get(`/submissions/progress?exam=${exam._id}`);

        if (typeof res.data.remainingSeconds === "number") {
          setTimeLeft(res.data.remainingSeconds);
        }
      } catch (error) {
        console.log("Failed to load timer", error);
      }
    };

    loadServerTimer();
  }, [exam, user]);

  const requestExamPermissions = async () => {
    try {
      setPermissionRequested(true);
      setPermissionError("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionReady(false);

        setPermissionError(
          "Camera or microphone access is not available. Use HTTPS or allow browser permissions."
        );

        toast.error("Camera or microphone permission not available");
        return;
      }

      const constraints = {
        video: !!exam?.securitySettings?.camera,
        audio: !!exam?.securitySettings?.microphone,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setMediaStream(stream);
      setCameraEnabled(!!exam?.securitySettings?.camera);

      setTimeout(() => {
        setPermissionReady(true);
      }, 300);

      toast.success("Permission granted. Exam started.");
    } catch (error) {
      console.log(error);

      if (exam?._id && user?.id) {
        localStorage.removeItem(`active_exam_${exam._id}_${user.id}`);
      }

      setPermissionReady(false);
      setCameraEnabled(false);

      setPermissionError(
        "Camera or microphone permission denied. Please allow access to start the exam."
      );

      toast.error("Permission required to start exam");
    }
  };

  useEffect(() => {
    if (!exam) return;

    const needsCamera = exam?.securitySettings?.camera;
    const needsMicrophone = exam?.securitySettings?.microphone;

    if (!needsCamera && !needsMicrophone) {
      setPermissionReady(true);
      return;
    }

    if (!permissionRequested) {
      requestExamPermissions();
    }
  }, [exam, permissionRequested]);

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  const shuffledQuestions = useMemo(() => {
    if (!exam?.questions) return [];

    const studentSeed =
      user?.id?.split("")?.reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 1;

    return exam.questions.map((q, index) => ({
      ...q,
      shuffledOptions:
        q.type === "mcq"
          ? shuffleArray(q.options || [], studentSeed + index)
          : q.options || [],
    }));
  }, [exam, user]);

  const logViolation = async (type, message) => {
    if (!exam?._id || !navigator.onLine) return;

    try {
      await API.post("/proctor/violation", {
        exam: exam._id,
        type,
        message,
      });
    } catch (error) {
      console.log("Violation log failed", error);
    }
  };

  const submitExam = async () => {
    if (submittedRef.current || !exam || !user) return;

    const finalAnswers = answersRef.current;

    localStorage.setItem(
      `final_submit_backup_${exam._id}_${user.id}`,
      JSON.stringify(finalAnswers)
    );

    if (!navigator.onLine) {
      localStorage.setItem(
        `pending_submit_${exam._id}_${user.id}`,
        JSON.stringify({
          exam: exam._id,
          answers: finalAnswers,
          savedAt: new Date().toISOString(),
        })
      );

      setIsOffline(true);
      setSaveStatus("Offline");

      toast.error(
        "No internet connection. Submission saved locally. Reconnect to submit."
      );

      return;
    }

    try {
      submittedRef.current = true;
      setSubmitted(true);

      await API.post("/submissions/submit", {
        exam: exam._id,
        answers: finalAnswers,
      });

      localStorage.removeItem(`exam_${exam._id}_${user.id}`);
      localStorage.removeItem(`review_${exam._id}_${user.id}`);
      localStorage.removeItem(`active_exam_${exam._id}_${user.id}`);
      localStorage.removeItem(`refresh_count_${exam._id}_${user.id}`);
      localStorage.removeItem(`pending_submit_${exam._id}_${user.id}`);

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }

      toast.success("Exam submitted successfully");

      setTimeout(() => {
        navigate("/student-dashboard");
      }, 800);
    } catch (error) {
      console.log(error);
      submittedRef.current = false;
      setSubmitted(false);
      toast.error(error.response?.data?.message || "Submission failed");
    }
  };

  useEffect(() => {
    if (!exam) {
      navigate("/student-dashboard");
    }
  }, [exam, navigate]);

  useEffect(() => {
    if (!exam || !user || !permissionReady) return;

    const examKey = `active_exam_${exam._id}_${user.id}`;

    const tabId =
      sessionStorage.getItem("exam_tab_id") ||
      `${Date.now()}_${Math.random()}`;

    sessionStorage.setItem("exam_tab_id", tabId);

    const existingTab = localStorage.getItem(examKey);

    if (existingTab && existingTab !== tabId) {
      toast.error("This exam is already open in another tab");
      navigate("/student-dashboard");
      return;
    }

    localStorage.setItem(examKey, tabId);

    const heartbeat = setInterval(() => {
      localStorage.setItem(examKey, tabId);
    }, 2000);

    const clearTab = () => {
      const currentTab = localStorage.getItem(examKey);

      if (currentTab === tabId) {
        localStorage.removeItem(examKey);
      }
    };

    window.addEventListener("beforeunload", clearTab);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", clearTab);
      clearTab();
    };
  }, [exam, user, navigate, permissionReady]);

  useEffect(() => {
    if (!exam || !user || submitted || !permissionReady) return;

    if (examStartedRef.current) return;

    examStartedRef.current = true;

    const refreshKey = `refresh_count_${exam._id}_${user.id}`;

    const currentRefreshCount = Number(localStorage.getItem(refreshKey) || 0);
    const updatedCount = currentRefreshCount + 1;

    localStorage.setItem(refreshKey, updatedCount);

    if (updatedCount > 1) {
      const refreshViolation = updatedCount - 1;

      toast.warning(`Page refresh detected. Violation ${refreshViolation}/3`);

      logViolation(
        "page-refresh",
        `Page refresh detected ${refreshViolation}/3`
      );

      setViolations((prev) => Math.max(prev, refreshViolation));
    }

    if (updatedCount > 3) {
      toast.error("Too many refresh attempts. Auto submitting exam.");

      logViolation(
        "auto-submit",
        "Exam auto submitted due to refresh violations"
      );

      submitExam();
    }
  }, [exam, user, submitted, permissionReady]);

  useEffect(() => {
    if (!exam || !user || submitted || !permissionReady) return;

    const pendingSubmitKey = `pending_submit_${exam._id}_${user.id}`;

    const handleOffline = () => {
      setIsOffline(true);
      setSaveStatus("Offline");
      toast.warning("Internet disconnected. Answers will save locally.");
    };

    const handleOnline = async () => {
      setIsOffline(false);
      setSaveStatus("Saving...");
      toast.success("Internet restored. Syncing progress...");

      try {
        const res = await API.post("/submissions/save-progress", {
          exam: exam._id,
          answers: answersRef.current,
        });

        setLastSavedTime(res.data.lastSavedAt || new Date().toISOString());

        if (typeof res.data.remainingSeconds === "number") {
          setTimeLeft(res.data.remainingSeconds);
        }

        setSaveStatus("Saved");

        const pendingSubmit = localStorage.getItem(pendingSubmitKey);

        if (pendingSubmit && !submittedRef.current) {
          toast.info("Pending submission found. Submitting now...");
          localStorage.removeItem(pendingSubmitKey);
          submitExam();
        }
      } catch (error) {
        console.log("Sync failed", error);
        setSaveStatus("Save Failed");
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [exam, user, submitted, permissionReady]);

  useEffect(() => {
    if (!exam) return;

    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);

    if (!exam.isPublished) {
      toast.error("This exam is not published yet");
      navigate("/student-dashboard");
      return;
    }

    if (now < start) {
      toast.info("Exam has not started yet");
      navigate("/student-dashboard");
      return;
    }

    if (now > end) {
      toast.error("Exam has ended");
      navigate("/student-dashboard");
    }
  }, [exam, navigate]);

  useEffect(() => {
    if (!exam?.securitySettings?.camera || !cameraEnabled || submitted) return;

    const captureInterval = setInterval(async () => {
      const imageSrc = webcamRef.current?.getScreenshot();

      if (!imageSrc || !navigator.onLine) return;

      try {
        await API.post("/proctor/snapshot", {
          exam: exam._id,
          image: imageSrc,
        });
      } catch (error) {
        console.log("Snapshot save failed", error);
      }
    }, 90000);

    return () => clearInterval(captureInterval);
  }, [exam, cameraEnabled, submitted]);

  useEffect(() => {
    if (!exam || !user || !permissionReady) return;

    const loadProgress = async () => {
      try {
        const localAnswers = localStorage.getItem(`exam_${exam._id}_${user.id}`);
        const localReviews = localStorage.getItem(
          `review_${exam._id}_${user.id}`
        );

        if (localAnswers) {
          const parsedAnswers = JSON.parse(localAnswers);
          setAnswers(parsedAnswers);
          answersRef.current = parsedAnswers;
        }

        if (localReviews) {
          const parsedReviews = JSON.parse(localReviews);
          setReviewedQuestions(parsedReviews);
          reviewedQuestionsRef.current = parsedReviews;
        }

        if (!navigator.onLine) return;

        const res = await API.get(`/submissions/progress?exam=${exam._id}`);

        if (res.data.found) {
          const serverAnswers = res.data.answers || [];

          setAnswers(serverAnswers);
          answersRef.current = serverAnswers;

          const reviewMap = {};

          serverAnswers.forEach((ans) => {
            if (ans.markedForReview) {
              reviewMap[ans.questionIndex] = true;
            }
          });

          setReviewedQuestions(reviewMap);
          reviewedQuestionsRef.current = reviewMap;

          if (res.data.lastSavedAt) {
            setLastSavedTime(res.data.lastSavedAt);
          }

          if (typeof res.data.remainingSeconds === "number") {
            setTimeLeft(res.data.remainingSeconds);
          }
        }
      } catch (error) {
        console.log("Failed to restore progress", error);
      }
    };

    loadProgress();
  }, [exam, user, permissionReady]);

  useEffect(() => {
    if (!exam || !user || submitted || !permissionReady) return;

    localStorage.setItem(`exam_${exam._id}_${user.id}`, JSON.stringify(answers));

    localStorage.setItem(
      `review_${exam._id}_${user.id}`,
      JSON.stringify(reviewedQuestions)
    );

    setSaveStatus(navigator.onLine ? "Saved Locally" : "Offline");
  }, [answers, reviewedQuestions, exam, user, submitted, permissionReady]);

  useEffect(() => {
    if (!exam || !user || submitted || !permissionReady) return;

    const saveInterval = setInterval(async () => {
      if (!navigator.onLine) {
        setSaveStatus("Offline");
        return;
      }

      try {
        setSaveStatus("Saving...");

        const res = await API.post("/submissions/save-progress", {
          exam: exam._id,
          answers: answersRef.current,
        });

        setLastSavedTime(res.data.lastSavedAt || new Date().toISOString());

        if (typeof res.data.remainingSeconds === "number") {
          setTimeLeft(res.data.remainingSeconds);
        }

        setSaveStatus("Saved");
      } catch (error) {
        console.log("Progress save failed", error);
        setSaveStatus("Save Failed");
      }
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [exam, user, submitted, permissionReady]);

  useEffect(() => {
  if (!exam || submitted || !permissionReady) return;

  if (timeLeft === null || timeLeft === undefined) return;

  if (timeLeft <= 0) {
    if (examStartedRef.current) {
      logViolation(
        "auto-submit",
        "Exam auto submitted because timer ended"
      );

      submitExam();
    }

    return;
  }

  const timer = setInterval(() => {
    setTimeLeft((prev) => Math.max(prev - 1, 0));
  }, 1000);

  return () => clearInterval(timer);
}, [timeLeft, exam, submitted, permissionReady]);

  useEffect(() => {
    if (!exam?.securitySettings || submitted || !permissionReady) return;

    const settings = exam.securitySettings;

    if (settings.fullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    let inactivityTimer;

    const increaseViolation = (message) => {
      setViolations((prev) => {
        const newCount = prev + 1;

        toast.warning(`${message}. Violation ${newCount}/3`);

        if (message.includes("Tab")) {
          logViolation("tab-switch", `${message}. Violation ${newCount}/3`);
        }

        if (message.includes("Fullscreen")) {
          logViolation(
            "fullscreen-exit",
            `${message}. Violation ${newCount}/3`
          );
        }

        if (message.includes("Back")) {
          logViolation(
            "back-navigation",
            `${message}. Violation ${newCount}/3`
          );
        }

        if (message.includes("keyboard")) {
          logViolation(
            "keyboard-shortcut",
            `${message}. Violation ${newCount}/3`
          );
        }

        if (message.includes("Developer")) {
          logViolation(
            "developer-tools",
            `${message}. Violation ${newCount}/3`
          );
        }

        if (message.includes("inactive")) {
          logViolation("inactivity", `${message}. Violation ${newCount}/3`);
        }

        if (newCount >= 3) {
          logViolation(
            "auto-submit",
            "Exam auto submitted due to multiple violations"
          );

          submitExam();
        }

        return newCount;
      });
    };

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);

      inactivityTimer = setTimeout(() => {
        increaseViolation("User inactive for too long");
      }, 300000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && settings.tabSwitchWarning) {
        increaseViolation("Tab switch detected");
      }
    };

    const handleFullscreenChange = () => {
      if (
        settings.fullscreen &&
        !document.fullscreenElement &&
        !submittedRef.current
      ) {
        increaseViolation("Fullscreen exited");
      }
    };

    const handleContextMenu = (e) => {
      if (settings.disableRightClick) {
        e.preventDefault();
      }
    };

    const handleCopyPaste = (e) => {
      if (!settings.disableCopyPaste) return;

      const tag = e.target.tagName?.toLowerCase();

      if (tag === "textarea" || tag === "input") {
        if (e.type === "paste" || e.type === "copy" || e.type === "cut") {
          e.preventDefault();
        }

        return;
      }

      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      const blocked =
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey &&
          ["U", "S", "P", "C", "V", "X"].includes(e.key.toUpperCase()));

      if (blocked) {
        e.preventDefault();

        increaseViolation("Restricted keyboard shortcut detected");
      }

      resetInactivityTimer();
    };

    const handleDevTools = () => {
      const threshold = 160;

      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > threshold || heightDiff > threshold) {
        increaseViolation("Developer tools detected");
      }
    };

    const handleBeforeUnload = (e) => {
      if (submittedRef.current) return;

      e.preventDefault();
      e.returnValue = "";
    };

    const handlePopState = () => {
      if (submittedRef.current) return;

      window.history.pushState(null, "", window.location.href);

      increaseViolation("Back navigation blocked");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("keydown", handleKeyDown);

    window.addEventListener("resize", handleDevTools);
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("click", resetInactivityTimer);
    window.addEventListener("beforeunload", handleBeforeUnload);

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("resize", handleDevTools);
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("click", resetInactivityTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [exam, submitted, permissionReady]);

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatLastSaved = () => {
    if (!lastSavedTime) return "Not saved yet";

    return new Date(lastSavedTime).toLocaleTimeString();
  };

  const saveAnswer = (value) => {
    setAnswers((prev) => {
      const updated = [...prev];

      updated[currentQuestion] = {
        questionIndex: currentQuestion,
        answer: value,
        markedForReview:
          reviewedQuestionsRef.current[currentQuestion] || false,
      };

      answersRef.current = updated;

      return updated;
    });
  };

  const toggleReview = () => {
    const newValue = !reviewedQuestionsRef.current[currentQuestion];

    setReviewedQuestions((prev) => {
      const updatedReviews = {
        ...prev,
        [currentQuestion]: newValue,
      };

      reviewedQuestionsRef.current = updatedReviews;

      return updatedReviews;
    });

    setAnswers((prev) => {
      const updated = [...prev];

      updated[currentQuestion] = {
        questionIndex: currentQuestion,
        answer: updated[currentQuestion]?.answer || "",
        markedForReview: newValue,
      };

      answersRef.current = updated;

      return updated;
    });
  };
  if (
    user?.role === "student" &&
    !user?.subjectSelectionCompleted
  ) {
    window.location.replace(
      "/select-subjects"
    );
  
    return null;
  }

  if (!exam || shuffledQuestions.length === 0) return null;

  const needsCamera = exam?.securitySettings?.camera;
  const needsMicrophone = exam?.securitySettings?.microphone;

  if ((needsCamera || needsMicrophone) && !permissionReady && permissionError) {
    return (
      <div className="exam-page">
        <div className="question-panel">
          <h2>Permission Required</h2>

          <p>
            This exam requires{" "}
            {needsCamera && needsMicrophone
              ? "camera and microphone"
              : needsCamera
              ? "camera"
              : "microphone"}{" "}
            access before starting.
          </p>

          <p className="warning-text">{permissionError}</p>

          <div className="question-actions">
            <button
              type="button"
              className="submit-exam-btn"
              onClick={requestExamPermissions}
            >
              Try Again
            </button>

            <button type="button" onClick={() => navigate("/student-dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if ((needsCamera || needsMicrophone) && !permissionReady && !permissionError) {
    return (
      <div className="exam-page">
        <div className="question-panel">
          <h2>Requesting Permission...</h2>
          <p>Please allow camera or microphone access in the browser popup.</p>
        </div>
      </div>
    );
  }

  const question = shuffledQuestions[currentQuestion];
  const selectedAnswer = answers[currentQuestion]?.answer || "";

  const answeredCount = answers.filter((item) => item?.answer?.trim?.()).length;

  const reviewCount = Object.keys(reviewedQuestions).filter(
    (key) => reviewedQuestions[key]
  ).length;

  const unansweredCount = shuffledQuestions.length - answeredCount;

  return (
    <div className="exam-page">
      <div className="exam-header">
        <h2>{exam.title}</h2>

        <div className="exam-status">
          <div className="violation-box">Violations: {violations}/3</div>

          <div className="timer">{formatTime()}</div>

          <div className="save-status">
            {saveStatus} | {formatLastSaved()}
          </div>

          {isOffline && <div className="offline-warning">Offline Mode</div>}

          {exam?.securitySettings?.camera && cameraEnabled && (
            <div className="webcam-box">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.45}
                videoConstraints={{
                  width: 160,
                  height: 100,
                  facingMode: "user",
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="exam-layout">
        <div className="question-panel">
          <h3>Question {currentQuestion + 1}</h3>

          <div className="math-question">{question.questionText}</div>

          {question.type === "mcq" ? (
            <div className="options">
              {question.shuffledOptions.map((option, index) => {
                const isSelected =
                  String(selectedAnswer).trim() === String(option).trim();

                return (
                  <button
                    key={`${currentQuestion}-${index}-${option}`}
                    type="button"
                    disabled={submitted}
                    className={
                      isSelected ? "option-btn selected" : "option-btn"
                    }
                    onClick={() => saveAnswer(option)}
                  >
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="answer-textarea"
              placeholder="Write your answer here"
              value={selectedAnswer}
              onChange={(e) => saveAnswer(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              disabled={submitted}
            />
          )}

          <div className="question-actions">
            <button
              type="button"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
            >
              Previous
            </button>

            <button
              type="button"
              disabled={currentQuestion === shuffledQuestions.length - 1}
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
            >
              Next
            </button>

            <button type="button" onClick={toggleReview}>
              {reviewedQuestions[currentQuestion]
                ? "Unmark Review"
                : "Mark for Review"}
            </button>

            <button
              type="button"
              disabled={submitted}
              onClick={() => setShowSubmitModal(true)}
              className="submit-exam-btn"
            >
              {submitted ? "Submitting..." : "Submit Exam"}
            </button>
          </div>
        </div>

        <div className="palette">
          <h3>Questions</h3>

          <div className="palette-grid">
            {shuffledQuestions.map((_, index) => (
              <button
                type="button"
                key={index}
                className={
                  currentQuestion === index
                    ? "palette-btn active"
                    : reviewedQuestions[index]
                    ? "palette-btn review"
                    : answers[index]?.answer
                    ? "palette-btn answered"
                    : "palette-btn"
                }
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="palette-legend">
            <p>
              <span className="legend active"></span>
              Current
            </p>

            <p>
              <span className="legend answered"></span>
              Answered
            </p>

            <p>
              <span className="legend review"></span>
              Review
            </p>

            <p>
              <span className="legend normal"></span>
              Not Answered
            </p>
          </div>
        </div>
      </div>

      {showSubmitModal && (
        <div className="submit-modal-overlay">
          <div className="submit-modal">
            <h2>Confirm Submission</h2>

            <p>Answered Questions: {answeredCount}</p>

            <p>Unanswered Questions: {unansweredCount}</p>

            <p>Marked For Review: {reviewCount}</p>

            <div className="submit-modal-actions">
              <button type="button" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </button>

              <button
                type="button"
                className="submit-exam-btn"
                disabled={submitted}
                onClick={() => {
                  if (unansweredCount > 0) {
                    const confirmSubmit = window.confirm(
                      `You have ${unansweredCount} unanswered question(s). Submit anyway?`
                    );

                    if (!confirmSubmit) return;
                  }

                  setShowSubmitModal(false);
                  submitExam();
                }}
              >
                {submitted ? "Submitting..." : "Final Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamPage;