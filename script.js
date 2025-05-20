document.addEventListener("DOMContentLoaded", function () {
  // DOM ELEMENTS
  const taskInput = document.getElementById("task-input");
  const taskDate = document.getElementById("task-date");
  const taskTime = document.getElementById("task-time");
  const taskCategory = document.getElementById("task-category");
  const taskReminder = document.getElementById("task-reminder");
  const addTaskBtn = document.getElementById("add-task");
  const taskList = document.getElementById("task-list");
  const themeToggle = document.getElementById("theme-toggle");
  const clearAllBtn = document.getElementById("clear-all");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const categoryBtns = document.querySelectorAll(".category-btn");
  const viewBtns = document.querySelectorAll(".view-btn");
  const addCategoryBtn = document.getElementById("add-category-btn");
  const taskCount = document.getElementById("task-count");
  const completedCount = document.getElementById("completed-count");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const calendarView = document.querySelector(".calendar-view");
  const listView = document.querySelector(".list-view");
  const currentMonthEl = document.getElementById("current-month");
  const calendarGrid = document.getElementById("calendar-grid");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const notificationContainer = document.getElementById(
    "notification-container"
  );

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";
  let currentCategory = "all";
  let currentView = "list";
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let searchQuery = "";
  let reminderTimeouts = [];

  // INITIALIZE
  renderTasks();
  updateStats();
  setInitialTheme();
  loadCategories();
  renderCalendar();
  checkReminders();

  // EVENT LISTENERS
  addTaskBtn.addEventListener("click", addTask);
  taskInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") addTask();
  });
  themeToggle.addEventListener("click", toggleTheme);
  clearAllBtn.addEventListener("click", clearAllTasks);
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      updateActiveFilter();
      renderTasks();
    });
  });
  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.category;
      updateActiveCategory();
      renderTasks();
    });
  });
  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      updateActiveView();
      if (currentView === "calendar") {
        renderCalendar();
      }
    });
  });
  addCategoryBtn.addEventListener("click", addNewCategory);
  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") performSearch();
  });
  prevMonthBtn.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });
  nextMonthBtn.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  // FUNCTION
  function setInitialTheme() {
    const savedTheme = localStorage.getItem("theme") || "light-mode";
    document.body.className = savedTheme;
    updateThemeIcon();
  }

  function toggleTheme() {
    document.body.classList.toggle("light-mode");
    document.body.classList.toggle("dark-mode");
    const currentTheme = document.body.classList.contains("dark-mode")
      ? "dark-mode"
      : "light-mode";
    localStorage.setItem("theme", currentTheme);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const icon = themeToggle.querySelector("i");
    if (document.body.classList.contains("dark-mode")) {
      icon.classList.replace("fa-moon", "fa-sun");
    } else {
      icon.classList.replace("fa-sun", "fa-moon");
    }
  }

  function addTask() {
    const text = taskInput.value.trim();
    const date = taskDate.value;
    const time = taskTime.value;
    const category = taskCategory.value;
    const reminder = taskReminder.checked;

    if (!text) {
      showNotification("Please enter a task description", "error");
      return;
    }

    const newTask = {
      id: Date.now(),
      text,
      completed: false,
      date: date || null,
      time: time || null,
      category,
      reminder,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    updateStats();

    // SET REMINDER IF ENABLED
    if (reminder && date) {
      setReminder(newTask);
    }

    // CLEAR INPUTS
    taskInput.value = "";
    taskDate.value = "";
    taskTime.value = "";
    taskReminder.checked = false;
    taskInput.focus();
  }

  function renderTasks() {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
      taskList.innerHTML =
        '<div class="empty-state">No tasks found. Add a task to get started!</div>';
      return;
    }
    let filteredTasks = [...tasks];

    //APPLY SEARCH FILTER
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.text.toLowerCase().includes(query) ||
          (task.category && task.category.toLowerCase().includes(query))
      );
    }

    // APPLY CATEGORY FILTER
    if (currentCategory !== "all") {
      filteredTasks = filteredTasks.filter(
        (task) => task.category === currentCategory
      );
    }

    // APPLY STATUS FILTER
    switch (currentFilter) {
      case "active":
        filteredTasks = filteredTasks.filter((task) => !task.completed);
        break;
      case "completed":
        filteredTasks = filteredTasks.filter((task) => task.completed);
        break;
      case "today":
        const today = new Date().toISOString().split("T")[0];
        filteredTasks = filteredTasks.filter((task) => task.date === today);
        break;
      case "upcoming":
        const now = new Date();
        filteredTasks = filteredTasks.filter((task) => {
          if (!task.date || task.completed) return false;
          const taskDate = new Date(task.date);
          return taskDate > now;
        });
        break;
    }

    if (filteredTasks.length === 0) {
      taskList.innerHTML =
        '<div class="empty-state">No tasks match the current filters.</div>';
      return;
    }

    // SORT TASKS
    filteredTasks.sort((a, b) => {
      // COMPLETED TASKS GO TO THE BUTTOM
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      //NO DATE TASKS GO BELOW DATED TASKS
      if (!a.date && b.date) return 1;
      if (a.date && !b.date) return -1;

      // BOTH HAVE DATES
      if (a.date && b.date) {
        const aDate = new Date(a.date);
        const bDate = new Date(b.date);

        // CHECCK IF TAKS ARE OVERDUE
        const now = new Date();
        const aIsOverdue = !a.completed && aDate < now;
        const bIsOverdue = !b.completed && bDate < now;

        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;
        if (aIsOverdue && bIsOverdue) return aDate - bDate;

        // SORT UPCOMING TASKS BY DATE
        return aDate - bDate;
      }

      // SORT BY CREATION TIME IF NO DATES OR BOTH HAVE NO DATES
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    filteredTasks.forEach((task) => {
      const taskItem = document.createElement("li");
      taskItem.className = `task-item category-${task.category}`;

      // ADD CLASSES BASED ON TASK STATUS
      if (task.completed) {
        taskItem.classList.add("completed");
      } else if (task.date) {
        const now = new Date();
        const taskDate = new Date(task.date);
        if (taskDate < now) {
          taskItem.classList.add("overdue");
        } else {
          taskItem.classList.add("upcoming");
        }
      }

      // FORMAT DATETIME FOR DISPLAY
      let datetimeDisplay = "";
      if (task.date) {
        const dateObj = new Date(task.date);
        const formattedDate = dateObj.toLocaleDateString("en-US", {
          month: "short",
          date: "numeric",
          year:
            dateObj.getFullYear() !== new Date().getFullYear()
              ? "numeric"
              : undefined,
        });
        datetimeDisplay = formattedDate;

        if (task.time) {
          const [hours, minutes] = task.time.split(":");
          const timeObj = new Date();
          timeObj.setHours(parseInt(hours), parseInt(minutes));
          datetimeDisplay += `, ${timeObj.toLocaleDateString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}`;
        }
      }

      // ADD REMINDER ICON IF REMINDER IS SET
      const reminderIcon = task.reminder
        ? '<i class="fas fa-bell reminder-icon"></i>'
        : "";

      taskItem.innerHTML = `<input type="checkbox" class="task-checkbox" ${
        task.completed ? "checked" : ""
      } data-id="${task.id}">
        <span class="task-text ${task.completed ? "completed" : ""}">${
        task.text
      } ${reminderIcon}</span>
        <span class="task-category">${getCategoryIcon(task.category)} ${
        task.category
      }</span>
        ${
          datetimeDisplay
            ? `<span class="task-datetime">${datetimeDisplay}</span>`
            : ""
        }
        <div class="task-actions">
        <button class="edit-btn" data-id="${
          task.id
        }"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" data-id="${
          task.id
        }"><i class="fas fa-trash"></i></button></div>`;
      taskList.appendChild(taskItem);
    });

    // ADD EVENT LISTENERS TO THE NEW ELEMENTS
    document.querySelectorAll(".task-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", toggleTaskComplete);
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", deleteTask);
    });

    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", editTask);
    });
  }

  function getCategoryIcon(category) {
    const icons = {
      work: '<i class="fas fa-briefcase"></i>',
      personal: '<i class="fas fa-home"></i>',
      shopping: '<i class="fas fa-shopping-cart"></i>',
      health: '<i class="fas fa-heart"></i>',
      other: '<i class="fas fa-ellipsis"></i>',
    };
    return icons[category] || "";
  }

  function toggleTaskComplete(e) {
    const taskId = parseInt(e.target.dataset.id);
    const task = tasks.find((task) => task.id === taskId);
    if (task) {
      task.completed = e.target.checked;
      saveTasks();
      renderTasks();
      updateStats();

      if (currentView === "calendar") {
        renderCalendar();
      }
    }
  }

  function deleteTask(e) {
    const taskId = parseInt(e.currentTarget.dataset.id);
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    renderTasks();
    updateStats();

    if (currentView === "calendar") {
      renderCalendar();
    }
  }

  function editTask(e) {
    const taskId = parseInt(e.currentTarget.dataset.id);
    const task = tasks.find((task) => task.id === taskId);
    if (!task) return;

    const newText = prompt("Edit your task:", task.text);
    if (newText !== null && newText.trim() !== "") {
      task.text = newText.trim();
      saveTasks();
      renderTasks();

      if (currentView === "calendar") {
        renderCalendar();
      }
    }
  }

  function updateActiveFilter() {
    filterBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === currentFilter);
    });
  }

  function updateActiveCategory() {
    categoryBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === currentCategory);
    });
  }

  function updateActiveView() {
    viewBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === currentView);
    });

    if (currentView === "list") {
      listView.classList.remove("hidden");
      calendarView.classList.add("hidden");
    } else {
      listView.classList.add("hidden");
      calendarView.classList.remove("hidden");
    }
  }

  function clearAllTasks() {
    if (confirm("Are you sure you want to delete all tasks?")) {
      tasks = [];
      saveTasks();
      renderTasks();
      updateStats();

      if (currentView === "calendar") {
        renderCalendar();
      }
    }
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function updateStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.completed).length;
    const activeTasks = totalTasks - completedTasks;

    taskCount.textContent = `${activeTasks} ${
      activeTasks === 1 ? "task" : "tasks"
    } remaining`;
    completedCount.textContent = `${completedTasks} completed`;
  }

  function loadCategories() {
    // IN A MORE ADVANCCED VERSION, YOU MIGHT LOAD CUSTOM CATEGORIES FOR LOACALSTORAGE
  }

  function addNewCategory() {
    const categoryName = prompt("Enter new Category name:");
    if (categoryName && categoryName.trim()) {
      // IN A REAL APP, YOU WOULD SAVE THIS TO LOCALSTORAGE AND UPDATE THE UI
      showNotification(`Category "${categoryName}" added!`, "success");
    }
  }

  function performSearch() {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderTasks();
  }

  // CALENDAR VIEW FUNCTIONS
  function renderCalendar() {
    calendarGrid.innerHTML = "";

    // SETT MONTH AND YEAR HEADER
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // GET FIRST DAY OF MONTH AND TOTAL DAYS IN MONTH
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // CREATE DAY HEADERS
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayNames.forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.className = "calendar-day-header";
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });

    // ADD EMPTY CELLS FOR DAYS BEFORE THE FIRST DAY OF THE MONTH
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-day empty";
      calendarGrid.appendChild(emptyDay);
    }

    // ADD CELLS FOR EACH DAY OF THE MONTH
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      dayCell.className = "calendar-day";

      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const dayTasks = tasks.filter((task) => task.date === dateStr);

      dayCell.innerHTML = `
                <div class="calendar-date">${day}</div>
                <div class="calendar-tasks" id="tasks-${dateStr}"></div>
            `;

      const tasksContainer = dayCell.querySelector(".calendar-tasks");

      dayTasks.forEach((task) => {
        const taskEl = document.createElement("div");
        taskEl.className = `calendar-task ${
          task.completed ? "completed" : ""
        } ${isTaskOverdue(task) ? "overdue" : ""}`;
        taskEl.textContent = task.text;
        taskEl.dataset.id = task.id;
        tasksContainer.appendChild(taskEl);

        taskEl.addEventListener("click", () => {
          // Scroll to and highlight the task in list view
          if (currentView !== "list") {
            currentView = "list";
            updateActiveView();
          }
          const taskItem = document.querySelector(
            `.task-checkbox[data-id="${task.id}"]`
          );
          if (taskItem) {
            taskItem.scrollIntoView({ behavior: "smooth", block: "center" });
            taskItem.parentElement.style.animation = "pulse 1s";
            setTimeout(() => {
              taskItem.parentElement.style.animation = "";
            }, 1000);
          }
        });
      });

      calendarGrid.appendChild(dayCell);
    }
  }

  function isTaskOverdue(task) {
    if (task.completed || !task.date) return false;
    const now = new Date();
    const taskDate = new Date(task.date);
    return taskDate < now;
  }

  // Reminder Functions
  function setReminder(task) {
    // Clear any existing reminder for this task
    clearReminder(task.id);

    const reminderTime = new Date(`${task.date}T${task.time || "12:00"}`);
    const now = new Date();

    // If reminder time is in the past, don't set it
    if (reminderTime <= now) return;

    // Calculate timeout duration
    const timeoutDuration = reminderTime - now;

    // Set timeout for the reminder
    const timeoutId = setTimeout(() => {
      showNotification(`Reminder: ${task.text}`, "reminder");
    }, timeoutDuration);

    // Store timeout ID so we can clear it later if needed
    reminderTimeouts.push({ id: task.id, timeoutId });
  }

  function clearReminder(taskId) {
    const index = reminderTimeouts.findIndex((item) => item.id === taskId);
    if (index !== -1) {
      clearTimeout(reminderTimeouts[index].timeoutId);
      reminderTimeouts.splice(index, 1);
    }
  }

  function checkReminders() {
    // Check for tasks with reminders that are due now or in the past
    tasks.forEach((task) => {
      if (task.reminder && !task.completed && task.date) {
        const reminderTime = new Date(`${task.date}T${task.time || "12:00"}`);
        if (reminderTime > new Date()) {
          setReminder(task);
        }
      }
    });
  }

  function showNotification(message, type = "info") {
    try {
      const notification = document.createElement("div");
      notification.className = `notification ${type}`;
      notification.innerHTML = `
      <span>${message}</span>
      <span class="notification-close">&times;</span>
    `;

      // Check if container exists
      if (!notificationContainer) {
        console.error("Notification container not found");
        return;
      }

      notificationContainer.appendChild(notification);

      // Add close handler only if element exists
      const closeBtn = notification.querySelector(".notification-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          notification.remove();
        });
      } else {
        console.warn("Close button not found in notification");
      }

      // Auto-remove after 5 seconds
      setTimeout(() => {
        notification.remove();
      }, 5000);
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }
});
