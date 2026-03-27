# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Environment variables should be provided at runtime via docker run --env-file or orchestrator
# Do NOT bake secrets into the image.
# Required env vars:
#   DATABASE_URL, REDIS_URL, JWT_SECRET_KEY/SECRET_KEY, APP_ENV, SMTP_HOST, SMTP_PORT,
#   SMTP_USERNAME, SMTP_PASSWORD, SMTP_SENDER_EMAIL

# Command to run the application
CMD ["python", "app.py"]
