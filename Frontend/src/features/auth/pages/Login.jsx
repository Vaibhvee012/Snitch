import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hook/useAuth";

const Login = () => {
  const { handleLogin } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await handleLogin(formData);
      navigate("/");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    color: "#1b1c1a",
    borderBottom: "1px solid #d0c5b5",
    fontFamily: "'Inter', sans-serif",
  };

  const handleFocus = (event) => {
    event.target.style.borderBottomColor = "#C9A96E";
  };

  const handleBlur = (event) => {
    event.target.style.borderBottomColor = "#d0c5b5";
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <main
        className="min-h-screen flex flex-col lg:flex-row selection:bg-[#C9A96E]/30"
        style={{
          backgroundColor: "#fbf9f6",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <section
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
          style={{ backgroundColor: "#f5f3f0" }}
          aria-label="Snitch fashion editorial"
        >
          <img
            src="/snitch_editorial_warm.jpg"
            alt="Snitch fashion editorial"
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: "brightness(0.97)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(27,24,20,0.62) 0%, rgba(27,24,20,0.08) 45%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 p-10 xl:p-14 flex flex-col justify-between z-10">
            <span
              className="text-sm font-medium tracking-[0.35em] uppercase"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: "#C9A96E",
              }}
            >
              Snitch.
            </span>
            <div>
              <p
                className="text-5xl xl:text-6xl font-light leading-[1.08] text-white mb-5"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Welcome
                <br />
                <em>back.</em>
              </p>
              <p
                className="text-sm font-light leading-relaxed max-w-xs"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Your next statement starts here. Sign in and make it yours.
              </p>
            </div>
          </div>
        </section>

        <section
          className="w-full lg:w-1/2 flex items-center justify-center min-h-screen px-6 sm:px-14 lg:px-20 py-12 sm:py-16"
          style={{ backgroundColor: "#fbf9f6" }}
        >
          <div className="w-full max-w-sm">
            <div className="lg:hidden mb-12 sm:mb-14">
              <span
                className="text-sm tracking-[0.35em] uppercase"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "#C9A96E",
                }}
              >
                Snitch.
              </span>
            </div>

            <header className="mb-10 sm:mb-12">
              <p
                className="text-[10px] uppercase tracking-[0.22em] mb-4 font-medium"
                style={{ color: "#C9A96E" }}
              >
                Welcome back to Snitch
              </p>
              <h1
                className="text-[2.6rem] xl:text-5xl font-light leading-[1.1]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "#1b1c1a",
                }}
              >
                Sign In
              </h1>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8 sm:gap-9">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-email"
                  className="text-[10px] uppercase tracking-[0.18em] font-medium"
                  style={{ color: "#7A6E63" }}
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="hello@example.com"
                  className="w-full bg-transparent outline-none py-3 text-sm transition-colors duration-300"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-password"
                  className="text-[10px] uppercase tracking-[0.18em] font-medium"
                  style={{ color: "#7A6E63" }}
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none py-3 text-sm transition-colors duration-300"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="text-sm"
                  style={{ color: "#9b3d32" }}
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300 mt-1 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: "#1b1c1a",
                  color: "#fbf9f6",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(event) => {
                  if (!isSubmitting) {
                    event.currentTarget.style.backgroundColor = "#C9A96E";
                    event.currentTarget.style.color = "#1b1c1a";
                  }
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "#1b1c1a";
                  event.currentTarget.style.color = "#fbf9f6";
                }}
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>

              <div className="flex items-center gap-4">
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "#e4e2df" }}
                />
                <span
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: "#B5ADA3" }}
                >
                  or
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "#e4e2df" }}
                />
              </div>

              <p className="text-center text-[11px]" style={{ color: "#B5ADA3" }}>
                New to Snitch?{" "}
                <Link
                  to="/register"
                  className="transition-colors duration-200"
                  style={{
                    color: "#7A6E63",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = "#C9A96E";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = "#7A6E63";
                  }}
                >
                  Create an account
                </Link>
              </p>
            </form>
          </div>
        </section>
      </main>
    </>
  );
};

export default Login;
