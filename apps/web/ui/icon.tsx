type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons = {
	logo: (props: IconProps) => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 400 400"
			className="fill-background stroke-foreground"
			{...props}>
			{/* White/dark background that adapts to theme */}
			<rect
				x="100"
				y="60"
				width="200"
				height="280"
				rx="40"
				ry="40"
				className="fill-foreground stroke-foreground"
			/>

			{/* Black/white "O" shape that adapts to theme */}
			<rect
				x="125"
				y="85"
				width="150"
				height="230"
				rx="30"
				ry="30"
				className="fill-background stroke-background"
			/>
		</svg>
	),
};
