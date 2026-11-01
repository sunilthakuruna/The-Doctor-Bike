/* Let the whole dashboard tile activate its existing details link. */
document.addEventListener('click', event => {
  const tile = event.target.closest('#content .cards .stat');
  if (!tile || event.target.closest('button, a, input, select, textarea')) return;
  tile.querySelector('.statmore[data-page]')?.click();
});
