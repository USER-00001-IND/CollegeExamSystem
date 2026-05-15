import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { toast } from "react-toastify";

import API from "../services/api";

import "../styles/dashboard.css";

function EvaluatePaper() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [paper, setPaper] = useState(null);

  const [loading, setLoading] = useState(true);

  const [answers, setAnswers] = useState([]);

  const fetchPaper = async () => {
    try {
      const res = await API.get(
        `/marking/paper/${id}`
      );

      setPaper(res.data);

      setAnswers(
        res.data.answers.map((ans) => ({
          questionIndex:
            ans.questionIndex,

          obtainedMarks:
            ans.obtainedMarks || 0,
        }))
      );
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load paper"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaper();
  }, []);

  const updateMarks = (
    questionIndex,
    value
  ) => {
    setAnswers((prev) =>
      prev.map((item) =>
        item.questionIndex ===
        questionIndex
          ? {
              ...item,
              obtainedMarks: value,
            }
          : item
      )
    );
  };

  const submitMarks = async () => {
    try {
      await API.put(
        `/marking/score/${id}`,
        {
          answers,
        }
      );

      toast.success(
        "Marks submitted successfully"
      );

      navigate("/assigned-papers");
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to submit marks"
      );
    }
  };

  if (loading) {
    return (
      <div className="modern-loader">
        Loading paper...
      </div>
    );
  }

  if (!paper) {
    return (
      <p className="empty-text">
        Paper not found
      </p>
    );
  }

  return (
    <div className="dashboard-page">
      <main className="dashboard-main">
        <h1>
          Evaluate Paper
        </h1>

        <div className="exam-info-card">
          <p>
            <strong>Paper ID:</strong>{" "}
            {paper.paperId}
          </p>

          <p>
            <strong>Exam:</strong>{" "}
            {paper.exam?.title}
          </p>

          <p>
            <strong>Subject:</strong>{" "}
            {paper.exam?.subject}
          </p>
        </div>

        {paper.answers.map(
          (answer, index) => {
            const question =
              paper.exam.questions[
                answer.questionIndex
              ];

            return (
              <div
                key={index}
                className="question-box"
              >
                <h3>
                  Question{" "}
                  {index + 1}
                </h3>

                <p>
                  {
                    question.questionText
                  }
                </p>

                <div className="submitted-answer">
                  <strong>
                    Submitted Answer:
                  </strong>

                  <p>
                    {answer.answer ||
                      "No Answer"}
                  </p>
                </div>

                <div className="marks-box">
                  <label>
                    Marks
                  </label>

                  <input
                    type="number"
                    min="0"
                    max={
                      question.marks
                    }
                    value={
                      answers.find(
                        (a) =>
                          a.questionIndex ===
                          answer.questionIndex
                      )?.obtainedMarks ||
                      0
                    }
                    onChange={(e) =>
                      updateMarks(
                        answer.questionIndex,
                        e.target.value
                      )
                    }
                  />

                  <span>
                    / {question.marks}
                  </span>
                </div>
              </div>
            );
          }
        )}

        <button
          onClick={submitMarks}
        >
          Submit Marks
        </button>
      </main>
    </div>
  );
}

export default EvaluatePaper;