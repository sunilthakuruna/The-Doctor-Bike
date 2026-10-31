/* Attendance is marked by staff status only; user-account sign-off is not part of this workflow. */
(function(){
  const dailyAttendanceBeforeRemovingSignoff=dailyAttendanceMarkup;
  dailyAttendanceMarkup=function(){
    const host=document.createElement('div');host.innerHTML=dailyAttendanceBeforeRemovingSignoff();
    host.querySelector('.attendanceSignoff')?.remove();
    return host.innerHTML;
  };
  render();
})();
