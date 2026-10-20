document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const activitySearch = document.getElementById("activity-search");
  const categoryFilter = document.getElementById("category-filter");
  const activitySort = document.getElementById("activity-sort");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let allActivities = {};

  function compareBySchedule([, first], [, second]) {
    const firstDays = first.schedule_days || [];
    const secondDays = second.schedule_days || [];
    const firstDay = firstDays.length ? Math.min(...firstDays) : 8;
    const secondDay = secondDays.length ? Math.min(...secondDays) : 8;
    return (
      firstDay - secondDay ||
      (first.start_time || "99:99").localeCompare(second.start_time || "99:99")
    );
  }

  function renderActivities() {
    const searchTerm = activitySearch.value.trim().toLocaleLowerCase();
    const selectedCategory = categoryFilter.value;
    const sortOrder = activitySort.value;

    const visibleActivities = Object.entries(allActivities)
      .filter(([name, details]) => {
        const matchesCategory =
          !selectedCategory || details.category === selectedCategory;
        const searchableText = [
          name,
          details.description,
          details.schedule,
          details.category,
        ]
          .join(" ")
          .toLocaleLowerCase();

        return matchesCategory && searchableText.includes(searchTerm);
      })
      .sort((first, second) => {
        const [firstName] = first;
        const [secondName] = second;
        if (sortOrder.startsWith("name")) {
          const comparison = firstName.localeCompare(secondName);
          return sortOrder === "name-asc" ? comparison : -comparison;
        }

        const comparison = compareBySchedule(first, second);
        return sortOrder === "schedule-asc" ? comparison : -comparison;
      });

    activitiesList.innerHTML = "";
    if (visibleActivities.length === 0) {
      activitiesList.innerHTML =
        '<p class="empty-results">No activities match your search.</p>';
      return;
    }

    visibleActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
          <h4>${name}</h4>
          <p class="activity-category">${details.category}</p>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  function populateFiltersAndSignup() {
    categoryFilter.replaceChildren(new Option("All categories", ""));
    activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

    const categories = [
      ...new Set(
        Object.values(allActivities)
          .map((details) => details.category)
          .filter(Boolean)
      ),
    ].sort((first, second) => first.localeCompare(second));

    categories.forEach((category) => {
      categoryFilter.add(new Option(category, category));
    });

    Object.keys(allActivities)
      .sort((first, second) => first.localeCompare(second))
      .forEach((name) => {
        activitySelect.add(new Option(name, name));
      });
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`Failed to load activities (${response.status})`);
      }
      allActivities = await response.json();
      populateFiltersAndSignup();
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  activitySearch.addEventListener("input", renderActivities);
  categoryFilter.addEventListener("change", renderActivities);
  activitySort.addEventListener("change", renderActivities);

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities and preserve the current search and filters.
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities and preserve the current search and filters.
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});