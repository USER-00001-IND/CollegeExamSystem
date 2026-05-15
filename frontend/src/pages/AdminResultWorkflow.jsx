import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";

function AdminResultWorkflow() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWorkflow = async () => {
    try {
      const res = await API.get(
        "/marking/admin-result-workflow"
      );

      setSubmissions(res.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load workflow"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflow();
  }, []);

  const approveResult = async (id) => {
    try {
      await API.put(
        `/marking/approve-result/${id}`
      );

      toast.success("Result approved");

      loadWorkflow();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Approval failed"
      );
    }
  };

  const signResult = async (id) => {
    try {
      await API.put(
        `/marking/sign-result/${id}`
      );

      toast.success("Result signed");

      loadWorkflow();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Signing failed"
      );
    }
  };

  const publishResult = async (id) => {
    try {
      await API.put(
        `/marking/publish-result/${id}`
      );

      toast.success("Result published");

      loadWorkflow();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Publishing failed"
      );
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h2>Loading workflow...</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Admin Result Workflow</h1>

      <div className="table-wrapper">
        <table className="exam-table">
          <thead>
            <tr>
              <th>Paper ID</th>
              <th>Student</th>
              <th>Exam</th>
              <th>Evaluator</th>
              <th>Score</th>
              <th>Status</th>
              <th>Approve</th>
              <th>Sign</th>
              <th>Publish</th>
            </tr>
          </thead>

          <tbody>
            {submissions.map((item) => (
              <tr key={item._id}>
                <td>
                  {item.paperId || "N/A"}
                </td>

                <td>
                  {item.student?.name || "Hidden"}
                </td>

                <td>
                  {item.exam?.title || "Exam"}
                </td>

                <td>
                  {item.evaluatedBy?.name ||
                    "Pending"}
                </td>

                <td>
                  {item.score ?? 0}
                  {" / "}
                  {item.exam?.totalMarks || 0}
                </td>

                <td>
                  {item.resultStatus ||
                    "pending"}
                </td>

                <td>
                  <button
                    disabled={
                      !item.evaluated ||
                      item.adminApproved
                    }
                    onClick={() =>
                      approveResult(item._id)
                    }
                  >
                    Approve
                  </button>
                </td>

                <td>
                  <button
                    disabled={
                      !item.adminApproved ||
                      item.digitallySigned
                    }
                    onClick={() =>
                      signResult(item._id)
                    }
                  >
                    Sign
                  </button>
                </td>

                <td>
                  <button
                    disabled={
                      !item.digitallySigned ||
                      item.resultPublished
                    }
                    onClick={() =>
                      publishResult(item._id)
                    }
                  >
                    Publish
                  </button>
                </td>
              </tr>
            ))}

            {!submissions.length && (
              <tr>
                <td colSpan="9">
                  No submissions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminResultWorkflow;