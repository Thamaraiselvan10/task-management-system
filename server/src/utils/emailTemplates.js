// Helper for common footer
const getFooter = () => `
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Task Management System. All rights reserved.</p>
    </div>
`;

// Helper for common header
const getHeader = (title) => `
    <div style="background-color: #4f46e5; padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
    </div>
`;

// Helper for base layout
const getBaseLayout = (headerTitle, content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headerTitle}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f9;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${getHeader(headerTitle)}
        <div style="padding: 40px 30px;">
            ${content}
        </div>
        ${getFooter()}
    </div>
</body>
</html>
`;

export const getWelcomeEmailTemplate = ({ name, email, password, loginUrl }) => {
    const content = `
        <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Welcome Aboard, ${name}!</h2>
        <p style="margin-bottom: 20px; color: #4b5563;">Your account has been successfully created by the administrator. You can now access the Task Management System to track your tasks and collaborate with your team.</p>
        
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Your Login Credentials</p>
            <div style="margin-bottom: 10px;">
                <span style="font-weight: 600; color: #374151;">Email:</span>
                <span style="color: #1f2937; font-family: monospace; font-size: 15px;">${email}</span>
            </div>
            <div>
                <span style="font-weight: 600; color: #374151;">Password:</span>
                <span style="color: #1f2937; font-family: monospace; font-size: 15px;">${password}</span>
            </div>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">Login to Dashboard</a>
        </div>

        <p style="color: #6b7280; font-size: 14px;"><strong>Note:</strong> For security reasons, we recommend changing your password after your first login.</p>
    `;
    return getBaseLayout('Task Management System', content);
};

export const getTaskAssignedEmailTemplate = ({ name, title, description, priority, deadline, taskUrl }) => {
    const priorityColors = {
        'High': '#ef4444',
        'Medium': '#f59e0b',
        'Low': '#10b981'
    };
    const priorityColor = priorityColors[priority] || '#6b7280';

    const content = `
        <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px;">New Task Assigned</h2>
        <p style="margin-bottom: 20px; color: #4b5563;">Hello ${name}, you have been assigned a new task.</p>
        
        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-left: 4px solid #4f46e5; border-radius: 4px; padding: 20px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #111827;">${title}</h3>
            
            <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                <span style="background-color: #eff6ff; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">Deadline: ${new Date(deadline).toLocaleDateString()}</span>
                <span style="background-color: ${priorityColor}15; color: ${priorityColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${priority} Priority</span>
            </div>

            <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">${description || 'No description provided.'}</p>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
            <a href="${taskUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">View Task Details</a>
        </div>
    `;
    return getBaseLayout('Task Assignment', content);
};

export const getTaskCompletedEmailTemplate = ({ name, title, completedBy, comment, taskUrl }) => {
    const content = `
        <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Task Completed</h2>
        <p style="margin-bottom: 20px; color: #4b5563;">Hello ${name},</p>
        <p style="margin-bottom: 20px; color: #4b5563;">The task <strong>${title}</strong> has been marked as <strong>Completed</strong> by ${completedBy}.</p>
        
        <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #047857; text-transform: uppercase; font-weight: 600;">Completion Comment</p>
            <p style="margin: 0; color: #065f46; font-style: italic;">"${comment}"</p>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
            <a href="${taskUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">Review Task</a>
        </div>
    `;
    return getBaseLayout('Task Completed', content);
};

export default { getWelcomeEmailTemplate, getTaskAssignedEmailTemplate, getTaskCompletedEmailTemplate };
